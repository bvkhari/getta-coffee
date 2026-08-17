"use server";

import { redirect } from "next/navigation";
import {
  addStamp,
  findByPhone,
  isValidPhone,
  normalisePhone,
  redeemReward,
  STAMPS_PER_REWARD,
  undoLastStamp,
} from "@/lib/members";
import {
  endStaffSession,
  isStaff,
  passcodeMatches,
  startStaffSession,
} from "@/lib/session";

export type StaffState = { error?: string };

async function requireStaff(): Promise<void> {
  if (!(await isStaff())) redirect("/staff");
}

export async function unlock(
  _prev: StaffState,
  form: FormData,
): Promise<StaffState> {
  const given = String(form.get("passcode") ?? "");
  if (!passcodeMatches(given)) return { error: "Wrong passcode." };

  await startStaffSession();
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
    open = await addStamp(memberId);
  } catch (error) {
    // A double-tap lands here; the first stamp already went through, so send
    // staff back to the member rather than showing a failure.
    if (isDuplicate(error)) redirect(`/staff/member/${memberId}?dup=1`);
    throw error;
  }

  redirect(
    `/staff/done/${memberId}?kind=${
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
  redirect(`/staff/done/${memberId}?kind=redeemed`);
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
