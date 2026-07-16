import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Flips a profile to premium and sets subscription_renews_at, while only
 * ever setting subscription_started_at once -- so renewals/extensions never
 * reset the weekly-summary anniversary anchored to it.
 */
export async function activatePremium(
  supabase: SupabaseClient<Database>,
  userId: string,
  renewsAt: Date,
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_started_at")
    .eq("id", userId)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({
      subscription_tier: "premium",
      subscription_renews_at: renewsAt.toISOString(),
      ...(profile?.subscription_started_at
        ? {}
        : { subscription_started_at: new Date().toISOString() }),
    })
    .eq("id", userId);
}
