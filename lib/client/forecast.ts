import type { ParticipantRow, SessionPoint } from "@/lib/client/analytics";

// Least-squares projection of a participant's (or a cohort's) overall score.
//
// Pure functions, no I/O, so the arithmetic can be checked in isolation --
// which matters, because these numbers get printed in a PDF and sent to a
// paying client.
//
// The honesty rule is built into the type: with fewer than MIN_POINTS scored
// sessions `projected` is null and `confidence` is "lemah". Drawing a trend
// line through two points and presenting it to a client as a forecast is the
// fastest way to lose their trust the first time it misses.

const DAY_MS = 86_400_000;
const MIN_POINTS = 4;

export type ForecastConfidence = "kuat" | "sedang" | "lemah";

export type Forecast = {
  points: number;
  /** Score change per day implied by the fitted line. */
  slopePerDay: number;
  /** Same slope expressed the way a trainer thinks about it. */
  slopePerWeek: number;
  /** Goodness of fit, 0..1. Low r2 means the line is noise, not a trend. */
  r2: number;
  current: number | null;
  /** Null when there is not enough data to project honestly. */
  projected: number | null;
  horizonDays: number;
  confidence: ForecastConfidence;
};

const EMPTY: Forecast = {
  points: 0,
  slopePerDay: 0,
  slopePerWeek: 0,
  r2: 0,
  current: null,
  projected: null,
  horizonDays: 0,
  confidence: "lemah",
};

/**
 * Fits overall score against time. `points` may be any session list; drills
 * and unscored sessions are ignored rather than counted as zeroes, which
 * would drag every line downwards.
 */
export function forecastScores(
  points: SessionPoint[],
  horizonDays: number,
  now = new Date(),
): Forecast {
  const scored = points
    .filter((p) => typeof p.overall === "number")
    .map((p) => ({
      t: new Date(p.createdAt).getTime() / DAY_MS,
      y: p.overall as number,
    }))
    .sort((a, b) => a.t - b.t);

  if (scored.length === 0) return { ...EMPTY, horizonDays };

  const current = Math.round(scored[scored.length - 1].y * 10) / 10;
  if (scored.length < MIN_POINTS) {
    return {
      ...EMPTY,
      points: scored.length,
      current,
      horizonDays,
      confidence: "lemah",
    };
  }

  const n = scored.length;
  const meanT = scored.reduce((a, p) => a + p.t, 0) / n;
  const meanY = scored.reduce((a, p) => a + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of scored) {
    const dt = p.t - meanT;
    const dy = p.y - meanY;
    sxx += dt * dt;
    sxy += dt * dy;
    syy += dy * dy;
  }

  // Every session on the same instant, or a perfectly flat score: the slope is
  // undefined / zero and there is nothing to project.
  if (sxx === 0) {
    return { ...EMPTY, points: n, current, horizonDays, confidence: "lemah" };
  }

  const slopePerDay = sxy / sxx;
  const intercept = meanY - slopePerDay * meanT;
  const r2 = syy === 0 ? 0 : Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy)));

  const targetT = now.getTime() / DAY_MS + horizonDays;
  const raw = intercept + slopePerDay * targetT;
  // Scores are 0..100; an unclamped line happily predicts 130 after a good week.
  const projected = Math.round(Math.max(0, Math.min(100, raw)) * 10) / 10;

  const confidence: ForecastConfidence =
    n >= 8 && r2 >= 0.5 ? "kuat" : n >= MIN_POINTS && r2 >= 0.2 ? "sedang" : "lemah";

  return {
    points: n,
    slopePerDay: Math.round(slopePerDay * 100) / 100,
    slopePerWeek: Math.round(slopePerDay * 7 * 10) / 10,
    r2: Math.round(r2 * 100) / 100,
    current,
    projected,
    horizonDays,
    confidence,
  };
}

const LOW_SCORE_THRESHOLD = 70;
const STALE_DAYS = 7;

// These strings are read by an Indonesian audience and reprinted in the PDF
// sent to the client, so they follow the same comma decimal separator the
// rest of the dashboard uses.
const num = (v: number) => v.toLocaleString("id-ID");

/**
 * Human-readable reasons a participant needs attention. Returns the reasons
 * themselves, not a score: the organizer has to act on this, and "risiko 0.72"
 * tells them nothing about what to do.
 */
export function riskFlags(
  row: ParticipantRow,
  forecast: Forecast | null,
  now = new Date(),
): string[] {
  const flags: string[] = [];

  if (!row.lastActiveAt) {
    flags.push("belum pernah latihan");
  } else {
    const idleDays = Math.floor(
      (now.getTime() - new Date(row.lastActiveAt).getTime()) / DAY_MS,
    );
    if (idleDays >= STALE_DAYS) flags.push(`tidak ada sesi ${idleDays} hari`);
  }

  if (row.avgOverall != null && row.avgOverall < LOW_SCORE_THRESHOLD) {
    flags.push(`rata-rata ${num(row.avgOverall)}, di bawah ${LOW_SCORE_THRESHOLD}`);
  }

  // Only report a decline the fit actually supports -- a "lemah" slope is
  // noise, and telling a client their staff are regressing on noise is worse
  // than saying nothing.
  if (
    forecast &&
    forecast.confidence !== "lemah" &&
    forecast.slopePerWeek <= -1
  ) {
    flags.push(`skor turun ${num(Math.abs(forecast.slopePerWeek))} poin/minggu`);
  }

  return flags;
}
