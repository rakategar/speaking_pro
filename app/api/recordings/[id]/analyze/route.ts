import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribe } from "@/lib/hf/asr";
import { scoreStructure } from "@/lib/hf/scoring-llm";
import { analyzeProsody, scoreFromFeatures } from "@/lib/prosody/client";

export const runtime = "nodejs";
export const maxDuration = 300; // ASR + LLM round-trips

// Below this, structure/intonation scoring is meaningless.
const MIN_DURATION_SECONDS = 10;
const MIN_WORDS = 5;

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

// POST /api/recordings/[id]/analyze -- orchestrates ASR -> prosody ->
// LLM structure scoring and persists the report. Idempotent: an existing
// report is replaced.
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
    .select("id, user_id, storage_path, duration_seconds, module_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!recording || !recording.storage_path) {
    return NextResponse.json(
      { error: "Rekaman tidak ditemukan" },
      { status: 404 },
    );
  }

  if (
    recording.duration_seconds !== null &&
    recording.duration_seconds < MIN_DURATION_SECONDS
  ) {
    await supabase.from("recordings").update({ status: "failed" }).eq("id", id);
    return NextResponse.json(
      {
        error: `Rekaman terlalu pendek (${Math.round(recording.duration_seconds)} detik). Bicaralah minimal ${MIN_DURATION_SECONDS} detik agar AI bisa menilai struktur dan intonasi Anda.`,
      },
      { status: 422 },
    );
  }

  await supabase
    .from("recordings")
    .update({ status: "analyzing" })
    .eq("id", id);

  try {
    const { data: blob, error: downloadError } = await supabase.storage
      .from("recordings")
      .download(recording.storage_path);
    if (downloadError || !blob) {
      throw new Error(`Unduh audio gagal: ${downloadError?.message}`);
    }

    // ASR and prosody are independent -- run them in parallel.
    const [asr, prosodyRaw] = await Promise.all([
      transcribe(blob),
      analyzeProsody(blob),
    ]);

    const wordCount = countWords(asr.text);
    if (wordCount < MIN_WORDS) {
      throw new Error(
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

    const scoring = await scoreStructure(asr.text, duration);

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
      recording_id: id,
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
    await supabase.from("reports").delete().eq("recording_id", id);
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert(reportRow)
      .select("id")
      .single();
    if (reportError || !report) {
      throw new Error(`Simpan laporan gagal: ${reportError?.message}`);
    }

    await supabase.from("score_history").insert({
      user_id: user.id,
      overall_score: overall,
      week_label: isoWeekLabel(new Date()),
    });

    await supabase
      .from("recordings")
      .update({ status: "analyzed" })
      .eq("id", id);

    return NextResponse.json({ reportId: report.id, recordingId: id });
  } catch (error) {
    console.error("[analyze] failed:", error);
    await supabase.from("recordings").update({ status: "failed" }).eq("id", id);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Analisis gagal, coba lagi.",
      },
      { status: 500 },
    );
  }
}
