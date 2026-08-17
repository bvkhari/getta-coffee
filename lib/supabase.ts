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
let client: ReturnType<typeof createClient<Database>> | null = null;

export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill it in — see README.",
      );
    }
    client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
