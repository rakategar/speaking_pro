import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications -- caller's notifications (RLS-scoped) + unread count,
// for the TopAppBar bell badge and the /notifications list.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: items } = await supabase
    .from("notifications")
    .select("id, type, title, body, url, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const list = items ?? [];
  const unread = list.filter((n) => !n.read_at).length;
  return NextResponse.json({ notifications: list, unread });
}

// PATCH /api/notifications -- mark notifications read. Body { id } marks one,
// or {} / { all: true } marks all of the caller's unread ones.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const nowIso = new Date().toISOString();
  let query = supabase
    .from("notifications")
    .update({ read_at: nowIso })
    .is("read_at", null);
  if (typeof body.id === "string") {
    query = query.eq("id", body.id);
  }
  // RLS restricts the update to the caller's own rows regardless.
  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
