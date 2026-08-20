import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const MEMBER_COOKIE = "getta_member";
const STAFF_COOKIE = "getta_staff";

// Deleting a cookie only works when the path matches the one it was set with,
// so both sides read these rather than repeating the literal.
const MEMBER_COOKIE_PATH = "/";
const STAFF_COOKIE_PATH = "/staff";
const THIRTY_DAYS = 60 * 60 * 24 * 30;
const TWELVE_HOURS = 60 * 60 * 12;

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to at least 32 characters — see README.",
    );
  }
  return value;
}

function sign(value: string): string {
  const mac = createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${mac}`;
}

function unsign(token: string | undefined): string | null {
  if (!token) return null;
  const cut = token.lastIndexOf(".");
  if (cut < 1) return null;

  const value = token.slice(0, cut);
  const given = Buffer.from(token.slice(cut + 1));
  const want = Buffer.from(
    createHmac("sha256", secret()).update(value).digest("base64url"),
  );

  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  return value;
}

/* ---------- member session ---------- */

export async function startMemberSession(memberId: string): Promise<void> {
  (await cookies()).set(MEMBER_COOKIE, sign(memberId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: MEMBER_COOKIE_PATH,
    maxAge: THIRTY_DAYS,
  });
}

export async function currentMemberId(): Promise<string | null> {
  return unsign((await cookies()).get(MEMBER_COOKIE)?.value);
}

export async function endMemberSession(): Promise<void> {
  (await cookies()).delete({ name: MEMBER_COOKIE, path: MEMBER_COOKIE_PATH });
}

/* ---------- staff session ---------- */

/**
 * One shared passcode unlocks the counter screen on the shop's own device.
 * Compared in constant time so the check does not leak the passcode's prefix.
 */
export function passcodeMatches(given: string): boolean {
  const want = process.env.STAFF_PASSCODE;
  if (!want) throw new Error("STAFF_PASSCODE is not set — see README.");

  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Unlocking picks a place, and the session carries it for the whole shift, so
 * stamps get tagged without a barista choosing per customer. The cookie is
 * already signed, which means the place cannot be edited into something else.
 *
 * The value is URL-encoded because a place can contain spaces and a "·", and
 * whether the cookie layer escapes those is not worth depending on.
 */
export async function startStaffSession(place: string): Promise<void> {
  (await cookies()).set(STAFF_COOKIE, sign(`staff:${encodeURIComponent(place)}`), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STAFF_COOKIE_PATH,
    maxAge: TWELVE_HOURS,
  });
}

/** The place this shift is stamping from, or null when not unlocked. */
export async function staffPlace(): Promise<string | null> {
  const value = unsign((await cookies()).get(STAFF_COOKIE)?.value);
  return value?.startsWith("staff:")
    ? decodeURIComponent(value.slice("staff:".length))
    : null;
}

export async function isStaff(): Promise<boolean> {
  return (await staffPlace()) !== null;
}

export async function endStaffSession(): Promise<void> {
  (await cookies()).delete({ name: STAFF_COOKIE, path: STAFF_COOKIE_PATH });
}
