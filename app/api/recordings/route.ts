import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // ~5 min opus is well under this

// POST /api/recordings -- multipart: audio (File), environment,
// durationSeconds, moduleSlug? Creates the row + uploads to Storage.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const audio = form.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { error: "File audio tidak ditemukan" },
      { status: 400 },
    );
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Rekaman terlalu besar (maks 5 menit)" },
      { status: 413 },
    );
  }

  const environment = String(form.get("environment") ?? "ceo-stage");
  const durationSeconds = Number(form.get("durationSeconds")) || null;
  const moduleSlug = form.get("moduleSlug");

  let moduleId: string | null = null;
  if (typeof moduleSlug === "string" && moduleSlug) {
    const { data: module } = await supabase
      .from("practice_modules")
      .select("id")
      .eq("slug", moduleSlug)
      .maybeSingle();
    moduleId = module?.id ?? null;
  }

  const { data: recording, error: insertError } = await supabase
    .from("recordings")
    .insert({
      user_id: user.id,
      module_id: moduleId,
      environment,
      duration_seconds: durationSeconds,
      status: "uploading",
    })
    .select("id")
    .single();
  if (insertError || !recording) {
    return NextResponse.json(
      { error: insertError?.message ?? "Gagal membuat rekaman" },
      { status: 500 },
    );
  }

  const ext = audio.type.includes("mp4") ? "mp4" : "webm";
  const storagePath = `${user.id}/${recording.id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("recordings")
    .upload(storagePath, audio, {
      contentType: audio.type || "audio/webm",
      upsert: true,
    });
  if (uploadError) {
    await supabase.from("recordings").delete().eq("id", recording.id);
    return NextResponse.json(
      { error: `Upload gagal: ${uploadError.message}` },
      { status: 500 },
    );
  }

  await supabase
    .from("recordings")
    .update({ storage_path: storagePath, status: "uploaded" })
    .eq("id", recording.id);

  return NextResponse.json({ id: recording.id }, { status: 201 });
}
