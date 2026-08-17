import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Server-only Supabase client using the service role key.
 *
 * Every read and write in this app happens in a server component or a server
 * action, so the browser never receives a Supabase key of any kind. RLS is on
 * with no policies, which means the anon key would read nothing even if it did
 * leak.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in — see README.`,
    );
  }
  return value;
}

let client: ReturnType<typeof createClient<Database>> | null = null;

export function db() {
  if (!client) {
    client = createClient<Database>(
      required("SUPABASE_URL"),
      required("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
