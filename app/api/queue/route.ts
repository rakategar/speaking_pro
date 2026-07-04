import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/queue -- the caller's active analysis job (if any) plus its
// position in the global queue. Used by the record page to block new input
// and by the post-submit "in queue" screen.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceRoleClient();
  const { data: job } = await service
    .from("analysis_jobs")
    .select("id, recording_id, status, attempts, created_at")
    .eq("user_id", user.id)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ active: false });
  }

  const { count } = await service
    .from("analysis_jobs")
    .select("id", { count: "exact", head: true })
    .in("status", ["queued", "processing"])
    .lte("created_at", job.created_at);

  return NextResponse.json({
    active: true,
    jobId: job.id,
    recordingId: job.recording_id,
    status: job.status,
    position: count ?? 1,
  });
}
