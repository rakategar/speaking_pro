// Downgrades Premium subscribers back to free once subscription_renews_at
// has passed. Every access gate in the app (middleware.ts, trial/status.ts,
// dashboard/profile pages) only ever reads subscription_tier -- nothing else
// compares subscription_renews_at to "now". Without this job a subscriber
// who paid once and never renewed again stays "premium" forever.

import { createServiceRoleClient } from "@/lib/supabase/server";

export async function expireLapsedSubscriptions() {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("profiles")
    .update({ subscription_tier: "free" })
    .eq("subscription_tier", "premium")
    .not("subscription_renews_at", "is", null)
    .lt("subscription_renews_at", now)
    .select("id");

  if (error) {
    console.error("[worker] expireLapsedSubscriptions failed:", error);
    return;
  }
  if (data?.length) {
    console.log(`[worker] downgraded ${data.length} lapsed subscription(s) to free`);
  }
}
