import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getTrialStatus } from "@/lib/trial/status";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // ~5 min opus is well under this
const MIN_DURATION_S = 15;
const MAX_DURATION_S_PREMIUM = 5 * 60 + 5; // small slack for timer rounding
const MAX_DURATION_S_TRIAL = 30;

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

  // Free-tier trial users get a 30s recording cap (Recording Studio
  // preview); Premium keeps the full 5-minute weekly submission.
  const trialStatus = await getTrialStatus(supabase, user.id);
  const MAX_DURATION_S =
    trialStatus.tier === "premium" ? MAX_DURATION_S_PREMIUM : MAX_DURATION_S_TRIAL;

  // One analysis in flight per user: refuse new input while a job waits.
  const { count: activeJobs } = await createServiceRoleClient()
    .from("analysis_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["queued", "processing"]);
  if ((activeJobs ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "Analisis rekaman Anda sebelumnya masih dalam antrean. Tunggu notifikasi selesai sebelum merekam lagi.",
      },
      { status: 409 },
    );
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
      { error: "Rekaman terlalu besar" },
      { status: 413 },
    );
  }

  const environment = String(form.get("environment") ?? "ceo-stage");
  const durationSeconds = Number(form.get("durationSeconds")) || null;
  const moduleSlug = form.get("moduleSlug");

  if (!durationSeconds || durationSeconds < MIN_DURATION_S) {
    return NextResponse.json(
      {
        error: `Rekaman terlalu pendek. Bicaralah minimal ${MIN_DURATION_S} detik agar AI bisa menilai Anda.`,
      },
      { status: 400 },
    );
  }
  if (durationSeconds > MAX_DURATION_S) {
    return NextResponse.json(
      {
        error:
          trialStatus.tier === "premium"
            ? "Rekaman melebihi batas maksimal 5 menit."
            : "Rekaman melebihi batas maksimal 30 detik untuk trial. Upgrade ke Premium untuk rekaman hingga 5 menit.",
      },
      { status: 400 },
    );
  }

  // Premium spends a weekly duration budget (5 min) before dipping into any
  // purchased top-up seconds. The debit is atomic in Postgres so two uploads
  // racing each other can't both pass the check. `debited` is how many
  // purchased seconds were actually taken, so a failed upload can refund
  // exactly that much below. Free/trial keep the old per-recording cap only.
  let debitedTopupSeconds = 0;
  if (trialStatus.tier === "premium") {
    const { data: quota, error: quotaError } = await supabase
      .rpc("consume_recording_quota", {
        p_user_id: user.id,
        p_seconds: Math.round(durationSeconds),
      })
      .single();

    if (quotaError) {
      return NextResponse.json(
        { error: "Gagal memeriksa kuota rekaman. Coba lagi." },
        { status: 500 },
      );
    }
    if (!quota?.allowed) {
      const remaining = quota?.weekly_remaining ?? 0;
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Sisa kuota rekaman minggu ini hanya ${remaining} detik. Tambah kuota 5 menit (Rp25.000) untuk melanjutkan.`
              : "Kuota rekaman mingguan Anda sudah habis. Tambah kuota 5 menit (Rp25.000) untuk melanjutkan.",
          reason: "quota_exhausted",
          weeklyRemainingSeconds: remaining,
          topupSecondsBalance: quota?.topup_balance ?? 0,
        },
        { status: 402 },
      );
    }
    debitedTopupSeconds = quota.debited ?? 0;
  }

  // Hands back any purchased seconds spent above, for paths that abort after
  // the debit. Weekly usage needs no undo -- it's derived from the recordings
  // row, which those paths delete.
  async function refundTopup() {
    if (debitedTopupSeconds <= 0) return;
    await createServiceRoleClient().rpc("add_topup_seconds", {
      p_user_id: user!.id,
      p_seconds: debitedTopupSeconds,
    });
  }

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
    await refundTopup();
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
    await refundTopup();
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
