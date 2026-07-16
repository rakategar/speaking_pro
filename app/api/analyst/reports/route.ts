import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUSES = new Set(["open", "in_progress", "resolved"]);

// GET /api/analyst/reports -- latest user-submitted problem reports for the
// super-admin inbox; POST updates a report's status. Both behind the analyst
// password cookie.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceRoleClient();
  const { data: reports, error } = await supabase
    .from("problem_reports")
    .select("id, user_id, category, message, screenshot_url, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((reports ?? []).map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const items = (reports ?? []).map((r) => ({
    ...r,
    user_name: profiles?.find((p) => p.id === r.user_id)?.full_name ?? "Pengguna",
  }));
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !STATUSES.has(status)) {
    return NextResponse.json(
      { error: "id dan status wajib" },
      { status: 400 },
    );
  }
  const { error } = await createServiceRoleClient()
    .from("problem_reports")
    .update({ status })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
