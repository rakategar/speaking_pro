import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { estimateEtaSeconds } from "@/lib/queue/eta";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/recordings/[id]/analyze -- enqueue the recording for analysis.
// The actual pipeline runs in the background worker (lib/queue/worker.ts);
// this returns immediately with the queue position. One active job per user.
export async function POST(
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
    .select("id, user_id, storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!recording || !recording.storage_path) {
    return NextResponse.json(
      { error: "Rekaman tidak ditemukan" },
      { status: 404 },
    );
  }

  const service = createServiceRoleClient();

  // Idempotent: an active job for this same recording just reports back.
  const { data: existing } = await service
    .from("analysis_jobs")
    .select("id, recording_id, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["queued", "processing"])
    .maybeSingle();

  if (existing && existing.recording_id !== id) {
    return NextResponse.json(
      {
        error:
          "Masih ada analisis Anda dalam antrean. Tunggu sampai selesai sebelum mengirim rekaman baru.",
      },
      { status: 409 },
    );
  }

  let job = existing;
  if (!job) {
    const { data: created, error: insertError } = await service
      .from("analysis_jobs")
      .insert({ recording_id: id, user_id: user.id })
      .select("id, recording_id, status, created_at")
      .single();
    if (insertError || !created) {
      return NextResponse.json(
        { error: insertError?.message ?? "Gagal membuat antrean" },
        { status: 500 },
      );
    }
    job = created;
    await service.from("recordings").update({ status: "queued" }).eq("id", id);
  }

  const etaSeconds = await estimateEtaSeconds(service, {
    status: job.status,
    created_at: job.created_at,
    started_at: null,
  });

  return NextResponse.json(
    { queued: true, jobId: job.id, etaSeconds },
    { status: 202 },
  );
}
