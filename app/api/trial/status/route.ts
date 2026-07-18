import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrialStatus } from "@/lib/trial/status";
import {
  getFreeRecordingUsage,
  getRecordingQuota,
} from "@/lib/recording/quota";

// GET /api/trial/status -- thin client-facing wrapper around
// getTrialStatus() for "use client" pages (Recording Studio, trial nudges)
// that can't call the server helper directly.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getTrialStatus(supabase, user.id);
  if (status.tier === "premium") {
    // Premium's cap is its remaining weekly quota (plus any purchased
    // seconds), so the Studio can auto-stop exactly on the budget instead of
    // letting the user record time it can't upload.
    const quota = await getRecordingQuota(supabase, user.id);
    return NextResponse.json({
      tier: "premium" as const,
      weeklyAllowanceSeconds: quota.weeklyAllowanceSeconds,
      weeklyUsedSeconds: quota.weeklyUsedSeconds,
      weeklyRemainingSeconds: quota.weeklyRemainingSeconds,
      topupSecondsBalance: quota.topupSecondsBalance,
      totalRemainingSeconds: quota.totalRemainingSeconds,
      weekResetsAt: quota.weekResetsAt.toISOString(),
    });
  }
  // Free tier gets a single lifetime recording; surfaced so the Studio can
  // block up front instead of letting the user record then rejecting it.
  const freeUsage = await getFreeRecordingUsage(supabase, user.id);
  return NextResponse.json({
    tier: "free" as const,
    trialDay: status.trialDay,
    isTrialExpired: status.isTrialExpired,
    maxRecordingSeconds: status.maxRecordingSeconds,
    freeRecordingsUsed: freeUsage.used,
    freeRecordingLimit: freeUsage.limit,
    freeRecordingExhausted: freeUsage.exhausted,
  });
}
