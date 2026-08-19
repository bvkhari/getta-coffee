import { unstable_cache, updateTag } from "next/cache";
import { db } from "@/lib/supabase";
import { currentMemberId } from "@/lib/session";

export const STAMPS_PER_REWARD = 5;

export type Member = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};

export type Card = {
  /** Stamps counting toward the next free drink. Can exceed the threshold. */
  stamps: number;
  /** Free drinks available to redeem right now. */
  rewardsReady: number;
  /** Free drinks taken in the past. */
  redeemed: number;
  /** Newest first. `location` is null for stamps taken before tagging existed. */
  visits: { at: string; location: string | null }[];
};

/** Strips formatting so "0123 456 789" and "0123456789" are the same member. */
export function normalisePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  return /^[0-9]{7,15}$/.test(phone);
}

const MEMBER_COLS = "id, name, phone, created_at";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findMember(
  column: "id" | "phone",
  value: string,
): Promise<Member | null> {
  // A non-UUID id is nobody, not a database error. Postgres answers a malformed
  // uuid with 22P02, and the throw below used to land as a 500 one line before
  // the caller's redirect could handle the miss.
  if (column === "id" && !UUID.test(value)) return null;

  const { data, error } = await db()
    .from("members")
    .select(MEMBER_COLS)
    .eq(column, value)
    .maybeSingle();

  if (error) throw error;
  return (data as Member | null) ?? null;
}

export const findByPhone = (phone: string) => findMember("phone", phone);
export const findById = (id: string) => findMember("id", id);

/**
 * The signed-in member, or null.
 *
 * Resolves the row rather than trusting the cookie's id, because a cookie can
 * outlive the member it names — a deleted record, or a restored database. The
 * callers that only checked for an id used to bounce `/` to `/card` and back
 * forever in that case.
 */
export async function currentMember(): Promise<Member | null> {
  const id = await currentMemberId();
  return id ? await findById(id) : null;
}

export async function createMember(
  name: string,
  phone: string,
): Promise<Member> {
  const { data, error } = await db()
    .from("members")
    .insert({ name, phone })
    .select(MEMBER_COLS)
    .single();

  if (error) throw error;
  return data as unknown as Member;
}

/**
 * Tag for one member's card. Cached reads are cleared by the three writes that
 * can change a balance, so a stamp shows up on the customer's phone straight
 * away and the minute below is only a backstop.
 */
const cardTag = (memberId: string) => `card:${memberId}`;
const A_MINUTE = 60;

export function getCard(memberId: string): Promise<Card> {
  // Built per call rather than once at module scope: the tag has to close over
  // the member id, and unstable_cache's options are fixed when it is created.
  return unstable_cache(
    async (): Promise<Card> => {
      const [open, past] = await Promise.all([
        db()
          .from("stamps")
          .select("created_at, location")
          .eq("member_id", memberId)
          .is("reward_id", null)
          .order("created_at", { ascending: false }),
        db()
          .from("rewards")
          .select("id")
          .eq("member_id", memberId),
      ]);

      if (open.error) throw open.error;
      if (past.error) throw past.error;

      const stamps = open.data.length;

      return {
        stamps,
        rewardsReady: Math.floor(stamps / STAMPS_PER_REWARD),
        redeemed: past.data.length,
        visits: open.data.map((row) => ({
          at: row.created_at as string,
          location: row.location as string | null,
        })),
      };
    },
    ["member-card", memberId],
    { tags: [cardTag(memberId)], revalidate: A_MINUTE },
  )();
}

export async function addStamp(
  memberId: string,
  location: string | null,
): Promise<number> {
  const { data, error } = await db().rpc("add_stamp", {
    p_member: memberId,
    p_location: location,
  });
  if (error) throw error;
  updateTag(cardTag(memberId));
  return data as unknown as number;
}

/**
 * How long after a stamp staff can still take it back. Long enough to catch the
 * slip after the customer has walked away, short enough that it isn't a way to
 * quietly remove stamps later.
 */
const UNDO_WINDOW_MS = 10 * 60 * 1000;

/** True when the newest stamp is still inside the undo window. */
export function canUndo(card: Card): boolean {
  const newest = card.visits[0];
  return newest
    ? Date.now() - new Date(newest.at).getTime() < UNDO_WINDOW_MS
    : false;
}

/** Removes the newest open stamp. Returns false if there was nothing to remove. */
export async function undoLastStamp(memberId: string): Promise<boolean> {
  const { data, error } = await db().rpc("undo_last_stamp", {
    p_member: memberId,
  });
  if (error) throw error;
  updateTag(cardTag(memberId));
  return data as unknown as boolean;
}

export async function redeemReward(memberId: string): Promise<string> {
  const { data, error } = await db().rpc("redeem_reward", {
    p_member: memberId,
  });
  if (error) throw error;
  updateTag(cardTag(memberId));
  return data as unknown as string;
}

/**
 * The code a member shows at the counter. Derived from the member id so it is
 * stable for that person and needs no storage; it identifies which card is on
 * screen, it is not a secret.
 */
export function voucherCode(memberId: string): string {
  let hash = 0;
  for (const char of memberId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  }
  return `GC ${String(hash).padStart(4, "0")}`;
}
