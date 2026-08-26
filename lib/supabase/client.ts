import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/config";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME } },
  );
}
