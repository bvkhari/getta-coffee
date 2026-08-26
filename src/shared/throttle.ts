import { db } from "@/shared/supabase";

/**
 * Whether this address has spent its unlock attempts. Counted in Postgres
 * rather than in memory because the app runs as serverless instances that start
 * cold and scale out — see supabase/migrations/0005_unlock_throttle.sql.
 */
export async function overUnlockLimit(ip: string): Promise<boolean> {
  const { data, error } = await db().rpc("note_unlock_attempt", { p_ip: ip });

  // Fail closed: if the throttle can't be counted, the passcode is unprotected.
  if (error) throw error;
  return data as unknown as boolean;
}
