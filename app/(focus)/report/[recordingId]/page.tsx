import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TrendChart } from "@/components/report/TrendChart";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { TopAppBar } from "@/components/layout/TopAppBar";
import type { Insight } from "@/lib/hf/scoring-llm";

type AiInsights = {
  summary?: string;
  insights?: Insight[];
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ recordingId: string }>;
}) {
  const { recordingId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: report } = await supabase
    .from("reports")
    .select(
      "*, recordings!reports_recording_id_fkey(environment, created_at, duration_seconds), next_module:practice_modules!reports_next_step_module_id_fkey(slug, title, category)",
    )
    .eq("recording_id", recordingId)
    .maybeSingle();
  if (!report) notFound();

  const { data: history } = await supabase
    .from("score_history")
    .select("week_label, overall_score, recorded_at")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(4);

  const trend = (history ?? []).reverse();
  const previousScore =
    trend.length >= 2 ? trend[trend.length - 2].overall_score : null;
  const delta =
    previousScore !== null && report.overall_score !== null
      ? report.overall_score - previousScore
      : null;

  const ai = (report.ai_insights ?? {}) as AiInsights;
  const insights = ai.insights ?? [];
  const nextModule = report.next_module;
  const recordedAt = report.recordings?.created_at
    ? new Date(report.recordings.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      <TopAppBar variant="back" title="Rapor Analisis" />
      <main className="pt-24 px-margin-mobile max-w-3xl mx-auto space-y-bento-gap pb-16">
        {/* Header */}
        <div className="py-2">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">
            Performance Snapshot
          </h1>
          <p className="font-body-md text-body-md text-text-secondary mt-1">
            {recordedAt
              ? `Berdasarkan rekaman Anda pada ${recordedAt}.`
              : "Berdasarkan rekaman terbaru Anda."}
          </p>
        </div>

        {/* Score metrics bento grid */}
        <div className="grid grid-cols-2 gap-bento-gap md:grid-cols-3">
          <div className="col-span-2 md:col-span-1 bg-primary rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-soft border border-white/10">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-brand-cyan/20 rounded-full blur-2xl" />
            <div className="relative z-10">
              <p className="font-label-md text-label-md text-brand-aqua uppercase tracking-wider">
                Overall Score
              </p>
              <div className="flex items-baseline mt-2">
                <span className="font-display-lg text-display-lg text-white">
                  {report.overall_score ?? "--"}
                </span>
                <span className="font-body-md text-body-md text-white/70 ml-1">
                  /100
                </span>
              </div>
              {delta !== null && (
                <p className="font-label-sm text-label-sm text-white/80 mt-2 flex items-center gap-1">
                  <span
                    className={`material-symbols-outlined text-[16px] ${delta >= 0 ? "text-brand-aqua" : "text-error-container"}`}
                  >
                    {delta >= 0 ? "trending_up" : "trending_down"}
                  </span>
                  {delta >= 0 ? "+" : ""}
                  {delta} dari sesi sebelumnya
                </p>
              )}
            </div>
          </div>

          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle flex flex-col items-center justify-center text-center">
            <CircularProgress
              value={report.confidence_score ?? 0}
              color="#00E5FF"
              label="Confidence"
            />
          </div>
          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle flex flex-col items-center justify-center text-center">
            <CircularProgress
              value={report.clarity_score ?? 0}
              color="#00A3FF"
              label="Clarity"
            />
          </div>
        </div>

        {/* Structure / Intonation / WPM / Filler quick stats */}
        <div className="grid grid-cols-2 gap-bento-gap">
          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle">
            <p className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Struktur Bahasa
            </p>
            <p className="font-headline-md text-headline-md text-primary mt-1">
              {report.structure_score ?? "--"}
              <span className="text-body-md text-text-secondary font-normal">
                /100
              </span>
            </p>
          </div>
          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle">
            <p className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Intonasi
            </p>
            <p className="font-headline-md text-headline-md text-primary mt-1">
              {report.intonation_score ?? "--"}
              <span className="text-body-md text-text-secondary font-normal">
                /100
              </span>
            </p>
          </div>
          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle">
            <p className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Kecepatan Bicara
            </p>
            <p className="font-headline-md text-headline-md text-primary mt-1">
              {report.wpm ?? "--"}
              <span className="text-body-md text-text-secondary font-normal">
                {" "}
                WPM
              </span>
            </p>
          </div>
          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle">
            <p className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Kata Pengisi
            </p>
            <p className="font-headline-md text-headline-md text-primary mt-1">
              {report.filler_word_count ?? "--"}
              <span className="text-body-md text-text-secondary font-normal">
                {" "}
                kali
              </span>
            </p>
          </div>
        </div>

        {/* Coach & AI Insights */}
        <div className="bg-surface-card rounded-3xl shadow-soft border border-stroke-subtle overflow-hidden mt-6">
          <div className="p-6 bg-brand-cyan/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                  <span className="material-symbols-outlined text-[18px]">
                    psychology
                  </span>
                </div>
                <h3 className="font-title-lg text-title-lg text-primary">
                  Coach &amp; AI Insights
                </h3>
              </div>
              <span className="bg-brand-cyan/10 text-secondary px-3 py-1 rounded-full font-label-sm text-label-sm">
                AI Review
              </span>
            </div>
            <div className="space-y-4 font-body-md text-body-md text-on-surface-variant">
              {ai.summary && <p>{ai.summary}</p>}
              <ul className="space-y-3 mt-4">
                {insights.map((insight, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-4 p-3 rounded-xl bg-white/50 border border-white/20"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] shrink-0 ${
                        insight.type === "strength"
                          ? "text-green-500"
                          : "text-orange-500"
                      }`}
                    >
                      {insight.type === "strength" ? "check_circle" : "error"}
                    </span>
                    <div className="space-y-1">
                      <p className="font-label-md text-label-md text-primary">
                        {insight.type === "strength"
                          ? "Kekuatan"
                          : "Perlu Ditingkatkan"}
                      </p>
                      <p className="text-on-surface-variant">{insight.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Transcript */}
        {report.transcript && (
          <details className="bg-surface-card rounded-3xl p-6 shadow-soft border border-stroke-subtle group">
            <summary className="font-title-lg text-title-lg text-primary cursor-pointer list-none flex items-center justify-between">
              Transkrip
              <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">
                expand_more
              </span>
            </summary>
            <p className="font-body-md text-body-md text-on-surface-variant mt-4 leading-relaxed whitespace-pre-wrap">
              {report.transcript}
            </p>
          </details>
        )}

        {/* Performance Trend */}
        {trend.length >= 2 && (
          <div className="bg-surface-card rounded-3xl p-6 shadow-soft border border-stroke-subtle mt-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-title-lg text-title-lg text-primary">
                Performance Trend
              </h3>
            </div>
            <TrendChart
              labels={trend.map((t) => t.week_label)}
              scores={trend.map((t) => t.overall_score)}
            />
          </div>
        )}

        {/* Next Steps */}
        {nextModule && (
          <div className="bg-primary-container rounded-3xl p-6 shadow-soft mt-6 relative overflow-hidden group mb-10">
            <div className="absolute right-0 bottom-0 w-48 h-48 bg-brand-cyan/10 rounded-full blur-3xl group-hover:bg-brand-cyan/20 transition-colors duration-500" />
            <div className="relative z-10">
              <h3 className="font-title-lg text-title-lg text-white mb-2">
                Next Steps
              </h3>
              <p className="font-body-md text-body-md text-white/70 mb-5">
                Fokus pada modul &ldquo;{nextModule.title}&rdquo; minggu ini
                untuk memperkuat area {nextModule.category.toLowerCase()} yang
                disorot di laporan Anda.
              </p>
              <Link
                href={`/record?module=${nextModule.slug}`}
                className="bg-brand-cyan text-white w-full py-3.5 rounded-full font-label-md text-label-md hover:bg-brand-cyan/90 transition-colors shadow-[0_4px_14px_rgba(0,163,255,0.39)] flex items-center justify-center gap-2"
              >
                Mulai {nextModule.title}
                <span className="material-symbols-outlined text-[18px]">
                  play_arrow
                </span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
