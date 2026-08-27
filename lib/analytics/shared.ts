/**
 * Pure aggregation shared by the two analytics surfaces: the B2B cohort
 * dashboard (lib/client/analytics.ts) and a participant's own lifetime
 * analysis (lib/progress/analytics.ts).
 *
 * Nothing in here touches the network or a Supabase client, so both a
 * service-role caller and an RLS-scoped user caller can use it. Whoever
 * fetches the rows decides what they are allowed to see; this file only shapes
 * and summarises what it is handed.
 *
 * PRIVACY: SELECT_RECORDINGS names its columns rather than using "*" so that
 * reports.transcript and reports.ai_insights cannot ride along into a caller
 * that must not have them. See the note in lib/client/analytics.ts.
 */

export const DAY_MS = 86_400_000;

/** Jakarta calendar day as YYYY-MM-DD -- the convention jakartaDayIndex() uses. */
export function jakartaDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export type MetricAverages = {
  overall: number | null;
  confidence: number | null;
  clarity: number | null;
  structure: number | null;
  intonation: number | null;
  wpm: number | null;
  fillerWordCount: number | null;
};

export type SessionPoint = {
  id: string;
  userId: string;
  createdAt: string;
  date: string; // YYYY-MM-DD, Jakarta
  isDrill: boolean;
  durationSeconds: number;
  moduleTitle: string | null;
  category: string | null;
  overall: number | null;
  clarity: number | null;
  confidence: number | null;
  structure: number | null;
  intonation: number | null;
  wpm: number | null;
  filler: number | null;
};

export type ParticipantStatus = "aktif" | "melambat" | "tidak aktif";

export type ParticipantRow = {
  userId: string;
  name: string | null;
  email: string;
  joinedAt: string;
  lastActiveAt: string | null;
  sessions: number;
  drills: number;
  minutes: number;
  avgOverall: number | null;
  latestOverall: number | null;
  deltaOverall: number | null;
  status: ParticipantStatus;
};

export type DayBucket = {
  date: string;
  sessions: number;
  drills: number;
  minutes: number;
  avgOverall: number | null;
};

export type OrgOverview = {
  participants: number;
  activeParticipants: number;
  sessions: number;
  drills: number;
  minutes: number;
  averages: MetricAverages | null;
  previousAverages: MetricAverages | null;
  daily: DayBucket[];
};

// Column list mirrors SELECT_RECORDINGS in lib/queue/weeklySummary.ts, minus
// transcript and ai_insights. See the privacy note at the top of this file.
export const SELECT_RECORDINGS =
  "id, user_id, created_at, status, duration_seconds, " +
  "reports(overall_score, confidence_score, clarity_score, structure_score, intonation_score, wpm, filler_word_count), " +
  "practice_modules(title, category)";

export type RecordingRow = {
  id: string;
  user_id: string;
  created_at: string;
  status: string;
  duration_seconds: number | null;
  reports:
    | {
        overall_score: number | null;
        confidence_score: number | null;
        clarity_score: number | null;
        structure_score: number | null;
        intonation_score: number | null;
        wpm: number | null;
        filler_word_count: number | null;
      }[]
    | null;
  practice_modules: { title: string; category: string } | null;
};

export function toPoints(rows: RecordingRow[]): SessionPoint[] {
  return rows.map((r) => {
    // The embed comes back as an array because reports has no unique
    // constraint declared on the FK in PostgREST's view of it; there is at
    // most one row per recording.
    const rep = Array.isArray(r.reports) ? r.reports[0] : r.reports;
    return {
      id: r.id,
      userId: r.user_id,
      createdAt: r.created_at,
      date: jakartaDayKey(new Date(r.created_at)),
      isDrill: r.status === "drill_completed",
      durationSeconds: r.duration_seconds ?? 0,
      moduleTitle: r.practice_modules?.title ?? null,
      category: r.practice_modules?.category ?? null,
      overall: rep?.overall_score ?? null,
      clarity: rep?.clarity_score ?? null,
      confidence: rep?.confidence_score ?? null,
      structure: rep?.structure_score ?? null,
      intonation: rep?.intonation_score ?? null,
      wpm: rep?.wpm ?? null,
      filler: rep?.filler_word_count ?? null,
    };
  });
}

export function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

export function metricAverages(points: SessionPoint[]): MetricAverages | null {
  const scored = points.filter((p) => !p.isDrill);
  if (scored.length === 0) return null;
  return {
    overall: avg(scored.map((p) => p.overall)),
    confidence: avg(scored.map((p) => p.confidence)),
    clarity: avg(scored.map((p) => p.clarity)),
    structure: avg(scored.map((p) => p.structure)),
    intonation: avg(scored.map((p) => p.intonation)),
    wpm: avg(scored.map((p) => p.wpm)),
    fillerWordCount: avg(scored.map((p) => p.filler)),
  };
}

/**
 * One bucket per calendar day in the window, including days with no activity.
 *
 * Walks forward from `start` rather than backward from "now" so an arbitrary
 * date range buckets the same way a rolling window does. Jakarta has no DST,
 * so stepping by 24h never skips or repeats a calendar day.
 */
export function bucketByDay(points: SessionPoint[], start: Date, days: number): DayBucket[] {
  const byDate = new Map<string, SessionPoint[]>();
  for (const p of points) {
    const list = byDate.get(p.date);
    if (list) list.push(p);
    else byDate.set(p.date, [p]);
  }
  const out: DayBucket[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = jakartaDayKey(new Date(start.getTime() + i * DAY_MS));
    const list = byDate.get(date) ?? [];
    out.push({
      date,
      sessions: list.filter((p) => !p.isDrill).length,
      drills: list.filter((p) => p.isDrill).length,
      minutes: Math.round(list.reduce((a, p) => a + p.durationSeconds, 0) / 60),
      avgOverall: avg(list.filter((p) => !p.isDrill).map((p) => p.overall)),
    });
  }
  return out;
}
