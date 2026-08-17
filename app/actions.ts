"use server";

import { redirect } from "next/navigation";
import {
  createMember,
  findByPhone,
  isValidPhone,
  normalisePhone,
} from "@/lib/members";
import { endMemberSession, startMemberSession } from "@/lib/session";

export type FormState = { error?: string };

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

  const existing = await findByPhone(phone);
  if (existing) {
    // Already a member — sign them in rather than dead-ending on an error.
    await startMemberSession(existing.id);
    redirect("/card");
  }

  const member = await createMember(name, phone);
  await startMemberSession(member.id);
  redirect("/card?welcome=1");
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
