import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/summaries/[id]/download -- streams a previously generated weekly
// summary PDF. RLS on both weekly_summaries and the private storage bucket
// scopes this to the caller's own rows, so it's safe to download repeatedly
// at any time (the file itself never expires or gets deleted).
export async function GET(
  request: Request,
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

  const { data: summary } = await supabase
    .from("weekly_summaries")
    .select("storage_path, week_index")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!summary) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage
    .from("weekly-summaries")
    .download(summary.storage_path);
  if (error || !file) {
    return NextResponse.json(
      { error: error?.message ?? "Gagal mengunduh file" },
      { status: 500 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ringkasan-minggu-${summary.week_index}.pdf"`,
    },
  });
}
