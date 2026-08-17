import { db } from "@/lib/supabase";

export const STAMPS_PER_REWARD = 5;

export type Member = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
};

export type Card = {
  member: Member;
  /** Stamps counting toward the next free drink. Can exceed the threshold. */
  stamps: number;
  /** Free drinks available to redeem right now. */
  rewardsReady: number;
  /** Free drinks taken in the past. */
  redeemed: number;
  visits: string[];
};

/** Strips formatting so "0123 456 789" and "0123456789" are the same member. */
export function normalisePhone(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  return /^[0-9]{7,15}$/.test(phone);
}

export async function findByPhone(phone: string): Promise<Member | null> {
  const { data, error } = await db()
    .from("members")
    .select("id, name, phone, created_at")
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw error;
  return (data as Member | null) ?? null;
}

export async function findById(id: string): Promise<Member | null> {
  const { data, error } = await db()
    .from("members")
    .select("id, name, phone, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Member | null) ?? null;
}

export async function createMember(
  name: string,
  phone: string,
): Promise<Member> {
  const { data, error } = await db()
    .from("members")
    .insert({ name, phone })
    .select("id, name, phone, created_at")
    .single();

  if (error) throw error;
  return data as unknown as Member;
}

export async function getCard(member: Member): Promise<Card> {
  const [open, past] = await Promise.all([
    db()
      .from("stamps")
      .select("created_at")
      .eq("member_id", member.id)
      .is("reward_id", null)
      .order("created_at", { ascending: false }),
    db()
      .from("rewards")
      .select("id")
      .eq("member_id", member.id),
  ]);

  if (open.error) throw open.error;
  if (past.error) throw past.error;

  const stamps = open.data.length;

  return {
    member,
    stamps,
    rewardsReady: Math.floor(stamps / STAMPS_PER_REWARD),
    redeemed: past.data.length,
    visits: open.data.map((row) => row.created_at as string),
  };
}

export async function addStamp(memberId: string): Promise<number> {
  const { data, error } = await db().rpc("add_stamp", { p_member: memberId });
  if (error) throw error;
  return data as unknown as number;
}

export async function redeemReward(memberId: string): Promise<string> {
  const { data, error } = await db().rpc("redeem_reward", {
    p_member: memberId,
  });
  if (error) throw error;
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
