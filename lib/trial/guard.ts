import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTrialStatus } from "@/lib/trial/status";

/**
 * Server-side enforcement for a single practice_modules slug: if the
 * signed-in user is on the free trial and this slug isn't unlocked yet
 * (per the trial_sequence ladder), bounce to its Library detail page
 * instead of rendering the drill. Can't be bypassed by hitting the URL
 * directly, unlike a client-only lock badge.
 */
export async function guardModuleAccess(slug: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return; // middleware already gates unauthenticated access

  const status = await getTrialStatus(supabase, user.id);
  if (status.tier === "free" && !status.unlockedSlugs.has(slug)) {
    redirect(`/library/${slug}`);
  }
}
