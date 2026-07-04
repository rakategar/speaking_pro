// The full ASR -> prosody -> LLM analysis pipeline, extracted from the old
// /api/recordings/[id]/analyze route so the queue worker can run it without
// a user session. All DB access is service-role; ownership was checked when
// the job was enqueued.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { transcribe } from "@/lib/gemini/asr";
import { scoreStructure } from "@/lib/gemini/scoring-llm";
import { analyzeProsody, scoreFromFeatures } from "@/lib/prosody/client";

// Below this, structure/intonation scoring is meaningless.
const MIN_DURATION_SECONDS = 15;
const MIN_WORDS = 5;

/**
 * Deterministic failures (bad/short/silent audio): retrying can never fix
 * them, so the worker gives up quietly instead of looping forever.
 */
export class PermanentAnalysisError extends Error {
  permanent = true as const;
}

export function isPermanentAnalysisError(
  e: unknown,
): e is PermanentAnalysisError {
  return e instanceof Error && (e as PermanentAnalysisError).permanent === true;
}

type StageTimings = {
  recording_id: string;
  user_id: string;
  status: "success" | "failed";
  error?: string | null;
  audio_bytes?: number | null;
  duration_seconds?: number | null;
  asr_ms?: number | null;
  prosody_ms?: number | null;
  llm_ms?: number | null;
  total_ms: number;
  asr_model?: string | null;
};

async function recordMetrics(t: StageTimings) {
  try {
    await createServiceRoleClient().from("analysis_metrics").insert(t);
  } catch (e) {
    console.error("[metrics] insert failed:", e);
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function isoWeekLabel(date: Date): string {
  // ISO week number for the trend chart's "Wk N" axis.
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `Wk ${week}`;
}

/**
 * Run the full analysis for one recording and persist the report.
 * Idempotent: an existing report is replaced.
 */
export async function runAnalysis(
  recordingId: string,
): Promise<{ reportId: string }> {
  const supabase = createServiceRoleClient();

  const { data: recording } = await supabase
    .from("recordings")
    .select("id, user_id, storage_path, duration_seconds, module_id, status")
    .eq("id", recordingId)
    .maybeSingle();
  if (!recording || !recording.storage_path) {
    throw new PermanentAnalysisError("Rekaman tidak ditemukan");
  }

  if (
    recording.duration_seconds !== null &&
    recording.duration_seconds < MIN_DURATION_SECONDS
  ) {
    await supabase
      .from("recordings")
      .update({ status: "failed" })
      .eq("id", recordingId);
    throw new PermanentAnalysisError(
      `Rekaman terlalu pendek (${Math.round(recording.duration_seconds)} detik). Minimal ${MIN_DURATION_SECONDS} detik.`,
    );
  }

  await supabase
    .from("recordings")
    .update({ status: "analyzing" })
    .eq("id", recordingId);

  const t0 = Date.now();
  let asrMs: number | null = null;
  let prosodyMs: number | null = null;
  let llmMs: number | null = null;
  let audioBytes: number | null = null;
  let asrModel: string | null = null;

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from("recordings")
      .download(recording.storage_path);
    if (downloadError || !blob) {
      throw new Error(`Unduh audio gagal: ${downloadError?.message}`);
    }
    audioBytes = blob.size;

    // ASR and prosody are independent -- run them in parallel.
    const tAsr = Date.now();
    const tProsody = Date.now();
    const [asr, prosodyRaw] = await Promise.all([
      transcribe(blob).then((r) => {
        asrMs = Date.now() - tAsr;
        return r;
      }),
      analyzeProsody(blob).then((r) => {
        prosodyMs = Date.now() - tProsody;
        return r;
      }),
    ]);
    asrModel = asr.model;

    const wordCount = countWords(asr.text);
    if (wordCount < MIN_WORDS) {
      throw new PermanentAnalysisError(
        "Tidak ada ucapan yang cukup terdeteksi dalam rekaman. Pastikan mikrofon aktif dan bicaralah dengan jelas, lalu coba lagi.",
      );
    }

    const duration = recording.duration_seconds;
    const wpm =
      duration && duration > 0 ? Math.round((wordCount / duration) * 60) : null;

    // The transcript gives a better WPM than the prosody service's
    // syllable estimate; recompute the intonation score with it.
    let prosody = prosodyRaw;
    if (wpm) {
      const features = { ...prosody.features, wpm };
      prosody = { features, intonation_score: scoreFromFeatures(features) };
    }

    const tLlm = Date.now();
    const scoring = await scoreStructure(asr.text, duration);
    llmMs = Date.now() - tLlm;

    const overall = Math.round(
      0.25 * scoring.confidence_score +
        0.2 * scoring.clarity_score +
        0.3 * scoring.structure_score +
        0.25 * prosody.intonation_score,
    );

    // Route the user to the module that targets their weakest dimension.
    const weakest = [
      { slug: "dynamic-pitch", score: prosody.intonation_score },
      { slug: "aiueo-drill", score: scoring.clarity_score },
      { slug: "breathing-control", score: scoring.confidence_score },
      { slug: "free-recording", score: scoring.structure_score },
    ].sort((a, b) => a.score - b.score)[0];
    const { data: nextModule } = await supabase
      .from("practice_modules")
      .select("id")
      .eq("slug", weakest.slug)
      .maybeSingle();

    const reportRow = {
      recording_id: recordingId,
      transcript: asr.text,
      overall_score: overall,
      confidence_score: scoring.confidence_score,
      clarity_score: scoring.clarity_score,
      structure_score: scoring.structure_score,
      intonation_score: prosody.intonation_score,
      wpm,
      filler_word_count: scoring.filler_word_count,
      ai_insights: {
        summary: scoring.summary,
        insights: scoring.insights,
        prosody_features: prosody.features,
        asr_model: asr.model,
      },
      next_step_module_id: nextModule?.id ?? null,
    };

    // Replace any previous report for this recording (re-analysis).
    await supabase.from("reports").delete().eq("recording_id", recordingId);
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert(reportRow)
      .select("id")
      .single();
    if (reportError || !report) {
      throw new Error(`Simpan laporan gagal: ${reportError?.message}`);
    }

    await supabase.from("score_history").insert({
      user_id: recording.user_id,
      overall_score: overall,
      week_label: isoWeekLabel(new Date()),
    });

    await supabase
      .from("recordings")
      .update({ status: "analyzed" })
      .eq("id", recordingId);

    await recordMetrics({
      recording_id: recordingId,
      user_id: recording.user_id,
      status: "success",
      audio_bytes: audioBytes,
      duration_seconds: duration,
      asr_ms: asrMs,
      prosody_ms: prosodyMs,
      llm_ms: llmMs,
      total_ms: Date.now() - t0,
      asr_model: asrModel,
    });

    return { reportId: report.id };
  } catch (error) {
    console.error("[analyze] failed:", error);
    // Only mark the recording failed for unfixable input; transient errors
    // stay "analyzing" because the worker will retry the job.
    if (isPermanentAnalysisError(error)) {
      await supabase
        .from("recordings")
        .update({ status: "failed" })
        .eq("id", recordingId);
    }
    await recordMetrics({
      recording_id: recordingId,
      user_id: recording.user_id,
      status: "failed",
      error: error instanceof Error ? error.message.slice(0, 500) : String(error),
      audio_bytes: audioBytes,
      duration_seconds: recording.duration_seconds,
      asr_ms: asrMs,
      prosody_ms: prosodyMs,
      llm_ms: llmMs,
      total_ms: Date.now() - t0,
      asr_model: asrModel,
    });
    throw error;
  }
}
