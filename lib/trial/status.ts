import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { jakartaDayIndex } from "@/lib/drills/plan";

export const TRIAL_DAYS = 7;

/** 1-indexed trial day, clamped to [1, TRIAL_DAYS]. */
export function trialDayIndex(trialStartedAt: string, now: Date = new Date()): number {
  const diff = jakartaDayIndex(now) - jakartaDayIndex(new Date(trialStartedAt));
  return Math.min(TRIAL_DAYS, Math.max(1, diff + 1));
}

export type TrialStatus =
  | { tier: "premium" }
  | {
      tier: "free";
      trialDay: number;
      isTrialExpired: boolean;
      unlockedSlugs: Set<string>;
      maxRecordingSeconds: 30;
    };

/**
 * Composes a free/premium user's trial state: which day of the 7-day trial
 * they're on, whether it's lapsed, and which practice_modules slugs are
 * unlocked so far (cumulative, per the trial_sequence ladder). Users who
 * haven't started onboarding/trial yet (trial_started_at null) are treated
 * as day 1 with nothing unlocked -- middleware routes them to /onboarding
 * before they can reach anything this gates anyway.
 */
export async function getTrialStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<TrialStatus> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_started_at, trial_ends_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.subscription_tier === "premium") {
    return { tier: "premium" };
  }

  const trialDay = profile?.trial_started_at
    ? trialDayIndex(profile.trial_started_at)
    : 1;
  const isTrialExpired = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at) < new Date()
    : false;

  const { data: modules } = await supabase
    .from("practice_modules")
    .select("slug, trial_sequence")
    .not("trial_sequence", "is", null)
    .lte("trial_sequence", trialDay * 3)
    .order("trial_sequence", { ascending: true });

  const unlockedSlugs = new Set((modules ?? []).map((m) => m.slug));

  return {
    tier: "free",
    trialDay,
    isTrialExpired,
    unlockedSlugs,
    maxRecordingSeconds: 30,
  };
}
