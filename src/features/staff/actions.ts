"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  addStamp,
  findByPhone,
  isValidPhone,
  normalisePhone,
  redeemReward,
  STAMPS_PER_REWARD,
  undoLastStamp,
} from "@/shared/members";
import { overUnlockLimit } from "@/shared/throttle";
import {
  createLocation,
  findActiveLocation,
  listLocations,
  setLocationActive,
} from "@/features/staff/locations";
import {
  endStaffSession,
  isStaff,
  passcodeMatches,
  staffPlace,
  startStaffSession,
} from "@/shared/session";

export type StaffState = { error?: string };

async function requireStaff(): Promise<void> {
  if (!(await isStaff())) redirect("/staff");
}

/** An event name is a label, not a paragraph. Long enough for "Aidilfitri Bazaar". */
const EVENT_NAME_MAX = 40;

export async function unlock(
  _prev: StaffState,
  form: FormData,
): Promise<StaffState> {
  // A shift starts with one unlock, so a cap this size is invisible to staff
  // and is the only thing standing between a 4-digit passcode and a script.
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await overUnlockLimit(ip)) {
    console.warn(`staff unlock: rate limited ${ip}`);
    return { error: "Too many attempts. Try again in 15 minutes." };
  }

  // The posted place is checked against an active row rather than trusted, so a
  // stale tab cannot unlock as a branch that has since closed.
  const place = await findActiveLocation(String(form.get("place") ?? ""));
  if (!place) return { error: "Pick a location first." };

  const given = String(form.get("passcode") ?? "");
  if (!passcodeMatches(given)) {
    // The only signal that someone is working through the keyspace.
    console.warn(`staff unlock: wrong passcode from ${ip}`);
    return { error: "Wrong passcode." };
  }

  const event = String(form.get("event") ?? "")
    .trim()
    .slice(0, EVENT_NAME_MAX);

  await startStaffSession(
    place.asks_event && event ? `${place.name} · ${event}` : place.name,
  );
  redirect("/staff/lookup");
}

export async function lockUp(): Promise<void> {
  await endStaffSession();
  redirect("/staff");
}

export async function lookUp(
  _prev: StaffState,
  form: FormData,
): Promise<StaffState> {
  await requireStaff();

  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (!isValidPhone(phone)) return { error: "Enter a phone number first." };

  const member = await findByPhone(phone);
  if (!member) return { error: "No member with that number." };

  redirect(`/staff/member/${member.id}`);
}

export async function stamp(form: FormData): Promise<void> {
  await requireStaff();

  const memberId = String(form.get("memberId") ?? "");

  let open: number;
  try {
    // The place comes from the signed cookie, never the form, so a tampered
    // request cannot credit a stamp to a branch it wasn't taken at.
    open = await addStamp(memberId, await staffPlace());
  } catch (error) {
    // A double-tap lands here; the first stamp already went through, so send
    // staff back to the member rather than showing a failure.
    if (isDuplicate(error)) redirect(`/staff/member/${memberId}?dup=1`);
    throw error;
  }

  // Land back on the customer's card, not the keypad: if that stamp completed
  // the card, REDEEM is right there without retyping the number.
  redirect(
    `/staff/member/${memberId}?done=${
      open >= STAMPS_PER_REWARD ? "reward" : "stamp"
    }`,
  );
}

export async function undoStamp(form: FormData): Promise<void> {
  await requireStaff();

  const memberId = String(form.get("memberId") ?? "");
  const removed = await undoLastStamp(memberId);

  redirect(`/staff/member/${memberId}?${removed ? "undone=1" : "expired=1"}`);
}

export async function redeem(form: FormData): Promise<void> {
  await requireStaff();

  const memberId = String(form.get("memberId") ?? "");
  await redeemReward(memberId);
  redirect(`/staff/member/${memberId}?done=redeemed`);
}

export async function addLocation(form: FormData): Promise<void> {
  await requireStaff();

  const name = String(form.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 40) {
    redirect("/staff/locations?bad=1");
  }

  try {
    await createLocation(name, form.get("asksEvent") === "on");
  } catch (error) {
    if (isUniqueViolation(error)) redirect("/staff/locations?taken=1");
    throw error;
  }

  redirect("/staff/locations?added=1");
}

/** Close a branch or reopen it. Nothing is ever deleted — see lib/locations.ts. */
export async function toggleLocation(form: FormData): Promise<void> {
  await requireStaff();

  const id = String(form.get("id") ?? "");
  const active = form.get("active") === "1";

  // Closing the last open location would leave nothing to unlock as, and the
  // only way back would be the database.
  if (!active && (await listLocations(true)).length < 2) {
    redirect("/staff/locations?last=1");
  }

  await setLocationActive(id, active);

  redirect(`/staff/locations?${active ? "reopened" : "closed"}=1`);
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

function isDuplicate(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.includes("duplicate_stamp")
  );
}
