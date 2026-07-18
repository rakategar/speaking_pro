import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { jakartaStartOfWeek } from "@/lib/drills/plan";

// Premium records whenever it likes, against a weekly duration budget rather
// than a recording count. Weekly usage is derived by summing the week's studio
// recordings instead of being tracked in a counter column, so it can't drift;
// only purchased seconds need durable state (profiles.topup_seconds_balance).
//
// Kept in sync with public.consume_recording_quota, which performs the actual
// atomic debit -- this helper is the read-only view used to render the UI.

export const WEEKLY_QUOTA_SECONDS = 5 * 60;

/** Seconds granted per paid top-up block (Rp25.000 for 5 minutes). */
export const TOPUP_BLOCK_SECONDS = 5 * 60;

/** Product type of the top-up row in coaching_products. */
export const TOPUP_PRODUCT_TYPE = "quota_topup";

/**
 * Free tier gets a single studio recording for the lifetime of the account --
 * a taste of the analysis, then upgrade. Unlike the Premium budget this never
 * resets, so it's a plain lifetime count rather than a windowed one.
 */
export const FREE_TIER_RECORDING_LIMIT = 1;

export type FreeRecordingUsage = {
  used: number;
  limit: number;
  exhausted: boolean;
};

export async function getFreeRecordingUsage(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<FreeRecordingUsage> {
  // Same rule as the Premium quota: drill logs have a client-reported
  // duration but no audio, so they aren't studio recordings and don't count.
  // Uploads that fail delete their row, so they don't burn the free take.
  const { count } = await supabase
    .from("recordings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", DRILL_STATUS);

  const used = count ?? 0;
  return {
    used,
    limit: FREE_TIER_RECORDING_LIMIT,
    exhausted: used >= FREE_TIER_RECORDING_LIMIT,
  };
}

/** Drill logs have a client-reported duration but no audio; they don't spend quota. */
const DRILL_STATUS = "drill_completed";

export type RecordingQuota = {
  weeklyAllowanceSeconds: number;
  weeklyUsedSeconds: number;
  weeklyRemainingSeconds: number;
  topupSecondsBalance: number;
  /** Weekly remainder plus purchased seconds -- what the user can actually record now. */
  totalRemainingSeconds: number;
  /** Monday 00:00 Asia/Jakarta of the following week. */
  weekResetsAt: Date;
};

export async function getRecordingQuota(
  supabase: SupabaseClient<Database>,
  userId: string,
  now: Date = new Date(),
): Promise<RecordingQuota> {
  const weekStart = jakartaStartOfWeek(now);

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase
      .from("recordings")
      .select("duration_seconds")
      .eq("user_id", userId)
      .neq("status", DRILL_STATUS)
      .gte("created_at", weekStart.toISOString()),
    supabase
      .from("profiles")
      .select("topup_seconds_balance")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  const weeklyUsedSeconds = Math.round(
    (rows ?? []).reduce((sum, r) => sum + (r.duration_seconds ?? 0), 0),
  );
  const weeklyRemainingSeconds = Math.max(
    0,
    WEEKLY_QUOTA_SECONDS - weeklyUsedSeconds,
  );
  const topupSecondsBalance = profile?.topup_seconds_balance ?? 0;

  const weekResetsAt = new Date(weekStart);
  weekResetsAt.setUTCDate(weekResetsAt.getUTCDate() + 7);

  return {
    weeklyAllowanceSeconds: WEEKLY_QUOTA_SECONDS,
    weeklyUsedSeconds,
    weeklyRemainingSeconds,
    topupSecondsBalance,
    totalRemainingSeconds: weeklyRemainingSeconds + topupSecondsBalance,
    weekResetsAt,
  };
}
