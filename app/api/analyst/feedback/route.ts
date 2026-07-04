import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/analyst/feedback -- latest analyzed reports for the coach to
// review; POST saves a coach_feedback note on one report. Both sit behind
// the analyst password cookie.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceRoleClient();
  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      "id, recording_id, overall_score, coach_feedback, created_at, recordings!reports_recording_id_fkey(user_id, duration_seconds)",
    )
    .order("created_at", { ascending: false })
    .limit(15);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [
    ...new Set(
      (reports ?? [])
        .map((r) => (r.recordings as { user_id?: string } | null)?.user_id)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const items = (reports ?? []).map((r) => {
    const rec = r.recordings as {
      user_id?: string;
      duration_seconds?: number | null;
    } | null;
    return {
      id: r.id,
      recording_id: r.recording_id,
      overall_score: r.overall_score,
      coach_feedback: r.coach_feedback,
      created_at: r.created_at,
      duration_seconds: rec?.duration_seconds ?? null,
      user_name:
        profiles?.find((p) => p.id === rec?.user_id)?.full_name ?? "Pengguna",
    };
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const reportId = typeof body.reportId === "string" ? body.reportId : "";
  const feedback =
    typeof body.feedback === "string" ? body.feedback.trim() : "";
  if (!reportId) {
    return NextResponse.json({ error: "reportId wajib" }, { status: 400 });
  }
  const { error } = await createServiceRoleClient()
    .from("reports")
    .update({ coach_feedback: feedback || null })
    .eq("id", reportId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
