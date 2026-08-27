/**
 * One participant's ENTIRE practice history, aggregated.
 *
 * Deliberately unlike /report/[recordingId], which judges a single recording:
 * this reads from the first session to the latest and answers "am I actually
 * getting better?". Everything here is derived from numbers the analysis
 * pipeline already stored -- no extra AI call, no extra cost.
 *
 * Runs as the USER (RLS-scoped client), not service-role: a participant may
 * only ever see their own history, and the database enforces that rather than
 * this file remembering to.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  SELECT_RECORDINGS,
  avg,
  jakartaDayKey,
  metricAverages,
  toPoints,
  type MetricAverages,
  type RecordingRow,
  type SessionPoint,
} from "@/lib/analytics/shared";
import { forecastScores, type Forecast } from "@/lib/client/forecast";
import { WEAK_THRESHOLD, type ReportSignals } from "@/lib/drills/plan";
import { mentorPicks, type MentorPick } from "@/lib/mentor/plan";
import { jakartaDayIndex } from "@/lib/drills/plan";

/** How many recent sessions count as "lately" when comparing against lifetime. */
const RECENT_WINDOW = 5;
const FORECAST_HORIZON_DAYS = 30;

/** Upper bound on history read in one go; nobody is near this. */
const MAX_ROWS = 1000;

export type MetricKey =
  | "confidence"
  | "clarity"
  | "structure"
  | "intonation"
  | "wpm"
  | "filler";

export type MetricTrend = {
  key: MetricKey;
  label: string;
  /** Lifetime average. */
  lifetime: number | null;
  /** Average of the last RECENT_WINDOW scored sessions. */
  recent: number | null;
  /** recent - lifetime, or null when either side is missing. */
  delta: number | null;
  /** Whether a HIGHER number is better. wpm and filler are the exceptions. */
  higherIsBetter: boolean;
  /** Scale for the bar; wpm is not out of 100. */
  max: number;
};

export type CategoryPerformance = {
  category: string;
  sessions: number;
  minutes: number;
  avgOverall: number | null;
};

export type MonthBucket = {
  /** YYYY-MM, Jakarta. */
  month: string;
  label: string;
  sessions: number;
  drills: number;
  minutes: number;
  avgOverall: number | null;
};

export type ProgressAnalysis = {
  hasData: boolean;
  firstSessionAt: string | null;
  lastSessionAt: string | null;
  totalSessions: number;
  totalDrills: number;
  totalMinutes: number;
  activeDays: number;
  bestStreakDays: number;
  overallFirst: number | null;
  overallLatest: number | null;
  overallBest: number | null;
  averages: MetricAverages | null;
  recentAverages: MetricAverages | null;
  metricTrends: MetricTrend[];
  byCategory: CategoryPerformance[];
  monthly: MonthBucket[];
  points: SessionPoint[];
  scoredPoints: SessionPoint[];
  forecast: Forecast;
  strengths: string[];
  weaknesses: string[];
  recommendations: MentorPick[];
  signals: ReportSignals | null;
};

const METRIC_DEFS: {
  key: MetricKey;
  label: string;
  pick: (p: SessionPoint) => number | null;
  higherIsBetter: boolean;
  max: number;
}[] = [
  { key: "confidence", label: "Kepercayaan Diri", pick: (p) => p.confidence, higherIsBetter: true, max: 100 },
  { key: "clarity", label: "Kejelasan", pick: (p) => p.clarity, higherIsBetter: true, max: 100 },
  { key: "structure", label: "Struktur Bahasa", pick: (p) => p.structure, higherIsBetter: true, max: 100 },
  { key: "intonation", label: "Intonasi", pick: (p) => p.intonation, higherIsBetter: true, max: 100 },
  { key: "wpm", label: "Kecepatan Bicara", pick: (p) => p.wpm, higherIsBetter: false, max: 220 },
  { key: "filler", label: "Kata Pengisi", pick: (p) => p.filler, higherIsBetter: false, max: 20 },
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function monthKey(iso: string): string {
  return jakartaDayKey(new Date(iso)).slice(0, 7); // YYYY-MM
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTH_LABELS[Number(month) - 1] ?? month} ${year.slice(2)}`;
}

/** Longest run of consecutive Jakarta days with at least one session. */
function longestStreak(dayKeys: string[]): number {
  const days = [...new Set(dayKeys)].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of days) {
    const index = Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 86_400_000);
    run = previous !== null && index === previous + 1 ? run + 1 : 1;
    previous = index;
    if (run > best) best = run;
  }
  return best;
}

function buildMetricTrends(
  all: SessionPoint[],
  recent: SessionPoint[],
): MetricTrend[] {
  return METRIC_DEFS.map((def) => {
    const lifetime = avg(all.map(def.pick));
    const recentValue = avg(recent.map(def.pick));
    return {
      key: def.key,
      label: def.label,
      lifetime,
      recent: recentValue,
      delta:
        lifetime !== null && recentValue !== null
          ? Math.round((recentValue - lifetime) * 10) / 10
          : null,
      higherIsBetter: def.higherIsBetter,
      max: def.max,
    };
  });
}

/**
 * Plain-language strengths and weaknesses. Every line quotes the number that
 * produced it -- a claim the user cannot check against the chart above it is
 * worse than no claim at all.
 */
function readSignals(trends: MetricTrend[]): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const n = (v: number) => (Math.round(v * 10) / 10).toLocaleString("id-ID");

  for (const t of trends) {
    if (t.recent === null) continue;

    if (t.higherIsBetter) {
      if (t.recent >= 80) strengths.push(`${t.label} kuat di angka ${n(t.recent)} pada sesi-sesi terakhir.`);
      else if (t.recent < WEAK_THRESHOLD) weaknesses.push(`${t.label} masih ${n(t.recent)}, di bawah ambang ${WEAK_THRESHOLD}.`);
    } else if (t.key === "wpm") {
      if (t.recent > 150) weaknesses.push(`Kecepatan bicara ${n(t.recent)} kata/menit — terlalu cepat untuk didengar nyaman.`);
      else if (t.recent >= 110) strengths.push(`Kecepatan bicara ${n(t.recent)} kata/menit sudah berada di rentang ideal.`);
    } else if (t.key === "filler") {
      if (t.recent >= 5) weaknesses.push(`Rata-rata ${n(t.recent)} kata pengisi per sesi.`);
      else strengths.push(`Kata pengisi terkendali di ${n(t.recent)} per sesi.`);
    }

    // A clear movement is worth saying out loud even when the level is fine.
    if (t.delta !== null && Math.abs(t.delta) >= 3) {
      const improving = t.higherIsBetter ? t.delta > 0 : t.delta < 0;
      const line = `${t.label} ${improving ? "membaik" : "menurun"} ${n(Math.abs(t.delta))} poin dibanding rata-rata Anda sendiri.`;
      (improving ? strengths : weaknesses).push(line);
    }
  }

  return { strengths: strengths.slice(0, 5), weaknesses: weaknesses.slice(0, 5) };
}

/**
 * Reads the caller's whole history. `supabase` must be the RLS-scoped user
 * client and `userId` the caller's own id -- the explicit filter keeps the
 * guarantee readable here rather than one migration away.
 */
export async function analyseProgress(
  supabase: SupabaseClient<Database>,
  userId: string,
  now: Date = new Date(),
): Promise<ProgressAnalysis> {
  const [{ data: rows }, { data: latestReport }] = await Promise.all([
    supabase
      .from("recordings")
      .select(SELECT_RECORDINGS)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(MAX_ROWS),
    supabase
      .from("reports")
      .select(
        "confidence_score, clarity_score, structure_score, intonation_score, wpm, filler_word_count, next_module:practice_modules!reports_next_step_module_id_fkey(slug)",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const points = toPoints((rows ?? []) as unknown as RecordingRow[]);
  const scored = points.filter((p) => !p.isDrill && p.overall !== null);
  const recent = scored.slice(-RECENT_WINDOW);

  const signals: ReportSignals | null = latestReport
    ? {
        confidence_score: latestReport.confidence_score,
        clarity_score: latestReport.clarity_score,
        structure_score: latestReport.structure_score,
        intonation_score: latestReport.intonation_score,
        wpm: latestReport.wpm,
        filler_word_count: latestReport.filler_word_count,
      }
    : null;
  const nextModule = latestReport?.next_module as { slug: string } | null | undefined;

  const byCategoryMap = new Map<string, SessionPoint[]>();
  for (const p of points) {
    const key = p.category ?? "Lainnya";
    const list = byCategoryMap.get(key);
    if (list) list.push(p);
    else byCategoryMap.set(key, [p]);
  }

  const byMonthMap = new Map<string, SessionPoint[]>();
  for (const p of points) {
    const key = monthKey(p.createdAt);
    const list = byMonthMap.get(key);
    if (list) list.push(p);
    else byMonthMap.set(key, [p]);
  }

  const metricTrends = buildMetricTrends(scored, recent);
  const { strengths, weaknesses } = readSignals(metricTrends);

  return {
    hasData: points.length > 0,
    firstSessionAt: points[0]?.createdAt ?? null,
    lastSessionAt: points[points.length - 1]?.createdAt ?? null,
    totalSessions: points.filter((p) => !p.isDrill).length,
    totalDrills: points.filter((p) => p.isDrill).length,
    totalMinutes: Math.round(points.reduce((a, p) => a + p.durationSeconds, 0) / 60),
    activeDays: new Set(points.map((p) => p.date)).size,
    bestStreakDays: longestStreak(points.map((p) => p.date)),
    overallFirst: scored[0]?.overall ?? null,
    overallLatest: scored[scored.length - 1]?.overall ?? null,
    overallBest: scored.length
      ? Math.max(...scored.map((p) => p.overall as number))
      : null,
    averages: metricAverages(points),
    recentAverages: metricAverages(recent),
    metricTrends,
    byCategory: [...byCategoryMap.entries()]
      .map(([category, list]) => ({
        category,
        sessions: list.length,
        minutes: Math.round(list.reduce((a, p) => a + p.durationSeconds, 0) / 60),
        avgOverall: avg(list.filter((p) => !p.isDrill).map((p) => p.overall)),
      }))
      .sort((a, b) => b.sessions - a.sessions),
    monthly: [...byMonthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, list]) => ({
        month,
        label: monthLabel(month),
        sessions: list.filter((p) => !p.isDrill).length,
        drills: list.filter((p) => p.isDrill).length,
        minutes: Math.round(list.reduce((a, p) => a + p.durationSeconds, 0) / 60),
        avgOverall: avg(list.filter((p) => !p.isDrill).map((p) => p.overall)),
      })),
    points,
    scoredPoints: scored,
    // Same honest forecast the B2B dashboard uses: under four scored sessions
    // it returns projected: null rather than a trend line through two points.
    forecast: forecastScores(scored, FORECAST_HORIZON_DAYS, now),
    strengths,
    weaknesses,
    recommendations: mentorPicks(signals, nextModule?.slug ?? null, jakartaDayIndex(now)),
    signals,
  };
}
