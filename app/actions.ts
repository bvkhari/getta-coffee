"use server";

import { redirect } from "next/navigation";
import {
  createMember,
  findByPhone,
  isValidPhone,
  normalisePhone,
} from "@/lib/members";
import { endMemberSession, startMemberSession } from "@/lib/session";

export type FormState = {
  error?: string;
  /** Set when the number is taken, so the form can offer to log in instead. */
  takenPhone?: string;
};

const TAKEN = "That number is already a member.";

export async function join(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const phone = normalisePhone(String(form.get("phone") ?? ""));

  if (name.length < 2) return { error: "Enter your full name." };
  if (!isValidPhone(phone)) {
    return { error: "Enter a phone number, digits only, 7 to 15 of them." };
  }

  // Never sign someone in off the join form. This used to log the visitor into
  // whichever account already held the number, which silently ignored the name
  // they typed and — for a single mistyped digit — dropped them inside a
  // stranger's card. Say the number is taken and let them choose.
  if (await findByPhone(phone)) {
    return { error: TAKEN, takenPhone: phone };
  }

  let member;
  try {
    member = await createMember(name, phone);
  } catch (error) {
    // Two joins racing for the same number: the unique index wins, and the
    // loser gets the same answer as if we had seen it on the read above.
    if (isDuplicatePhone(error)) return { error: TAKEN, takenPhone: phone };
    throw error;
  }

  await startMemberSession(member.id);
  redirect("/card?welcome=1");
}

function isDuplicatePhone(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

export async function logIn(
  _prev: FormState,
  form: FormData,
): Promise<FormState> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));

  if (!isValidPhone(phone)) return { error: "Enter your phone number." };

  const member = await findByPhone(phone);
  if (!member) {
    return { error: "No member found with that number. Try joining instead." };
  }

  await startMemberSession(member.id);
  redirect("/card");
}

export async function logOut(): Promise<void> {
  await endMemberSession();
  redirect("/");
}
