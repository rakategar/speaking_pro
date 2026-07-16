import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTrialStatus } from "@/lib/trial/status";

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
    return NextResponse.json({ tier: "premium" as const });
  }
  return NextResponse.json({
    tier: "free" as const,
    trialDay: status.trialDay,
    isTrialExpired: status.isTrialExpired,
    maxRecordingSeconds: status.maxRecordingSeconds,
  });
}
