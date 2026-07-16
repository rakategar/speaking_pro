import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/certificates/[id]/download -- streams the caller's one-time
// 1-month Premium certificate PDF. RLS on both monthly_certificates and the
// private storage bucket scopes this to the caller's own row, so it's safe
// to download repeatedly at any time.
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

  const { data: cert } = await supabase
    .from("monthly_certificates")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cert) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  const { data: file, error } = await supabase.storage
    .from("monthly-certificates")
    .download(cert.storage_path);
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
      "Content-Disposition": `attachment; filename="sertifikat-1-bulan-premium.pdf"`,
    },
  });
}
