// Admin Supabase client — server-only. Uses the service_role key which
// bypasses RLS. NEVER import this in Client Components or expose to the browser.
// Use only in trusted server-side contexts (migrations, admin actions).
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
