import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/recordings/[id] -- status + report (for client polling).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: recording } = await supabase
    .from("recordings")
    .select("id, status, environment, duration_seconds, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!recording) {
    return NextResponse.json(
      { error: "Rekaman tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("recording_id", id)
    .maybeSingle();

  return NextResponse.json({ recording, report });
}

// DELETE /api/recordings/[id] -- remove recording + audio + report.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: recording } = await supabase
    .from("recordings")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!recording) {
    return NextResponse.json(
      { error: "Rekaman tidak ditemukan" },
      { status: 404 },
    );
  }

  if (recording.storage_path) {
    await supabase.storage.from("recordings").remove([recording.storage_path]);
  }
  await supabase.from("reports").delete().eq("recording_id", id);
  await supabase.from("recordings").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
