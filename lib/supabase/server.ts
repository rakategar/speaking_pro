import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase/config";

// NEXT_PUBLIC_SUPABASE_URL resolves to this box's own public IP, so every
// server-side call hairpins out through NAT and back in through nginx -> Kong
// (~4x slower than reaching Kong directly). Talking to Kong internally avoids
// that; the cookie-less service-role client uses it.
//
// Service-role storage paths must build browser-facing URLs with
// publicStorageUrl() (lib/supabase/storage.ts), never getPublicUrl().
const INTERNAL_SUPABASE_URL =
  process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Server Component / Route Handler client -- reads the session from
// request cookies. Use for anything gated by the signed-in user's RLS.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { name: SUPABASE_AUTH_COOKIE_NAME },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component -- middleware refreshes the
            // session instead, so this can be safely ignored.
          }
        },
      },
    },
  );
}

// Service-role client for server-only operations that must bypass RLS
// (e.g. writing an ASR/LLM analysis result, uploading to another user's
// referenced storage path). Never import this from client code.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    INTERNAL_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
