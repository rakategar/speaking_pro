/**
 * The reporting window for the B2B dashboard.
 *
 * Replaces the old bare `days: number`, which could only ever express "the
 * last N days counting back from right now". A training program runs between
 * two real dates, and its report has to be able to say so.
 *
 * Every boundary is Asia/Jakarta, matching jakartaDayKey() and the rest of the
 * app: a client picking "1–31 Agustus" means Jakarta midnight to Jakarta
 * midnight, not UTC.
 */

const DAY_MS = 86_400_000;

/** Refuse anything sillier than this; also caps how much we ever fetch. */
export const MAX_RANGE_DAYS = 366;

export const ALLOWED_DAYS = [7, 30, 90];

export type Period = {
  start: Date;
  /** Exclusive upper bound. */
  end: Date;
  /** Length in whole days -- used for bucketing and the previous-period shift. */
  days: number;
  label: string;
  /** True for the fixed 7/30/90 presets, false for a hand-picked range. */
  preset: boolean;
  /** YYYY-MM-DD, only set for a custom range (for round-tripping into the UI). */
  from?: string;
  to?: string;
};

/**
 * Names the window for the AI narrative cache: two ranges of equal length are
 * different windows and must never share a cached narrative. See the
 * 20260828000001 migration.
 */
export function periodKey(period: Period): string {
  return period.preset ? `d${period.days}` : `${period.from}..${period.to}`;
}

/** Serialises a period back into query params, for links and fetches. */
export function periodQuery(period: Period): string {
  return period.preset
    ? `days=${period.days}`
    : `from=${period.from}&to=${period.to}`;
}

const fmt = (d: Date) =>
  d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

/** The rolling window the dashboard has always used. */
export function periodFromDays(days: number, now: Date = new Date()): Period {
  const safeDays = ALLOWED_DAYS.includes(days) ? days : 30;
  return {
    start: new Date(now.getTime() - safeDays * DAY_MS),
    end: now,
    days: safeDays,
    label: `${safeDays} hari terakhir`,
    preset: true,
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Jakarta midnight for a YYYY-MM-DD string. Returns null when the string is
 * not a real date (e.g. "2026-02-31", which Date would silently roll over to
 * 3 March).
 */
function jakartaMidnight(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Round-trip check: rejects impossible calendar days rather than accepting
  // whatever Date rolled them over to.
  const back = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
  return back === value ? parsed : null;
}

export type PeriodError =
  | "format"
  | "order"
  | "future"
  | "too_long";

export const PERIOD_ERROR_MESSAGE: Record<PeriodError, string> = {
  format: "Tanggal tidak valid. Gunakan format tanggal yang benar.",
  order: "Tanggal mulai tidak boleh setelah tanggal akhir.",
  future: "Tanggal akhir tidak boleh di masa depan.",
  too_long: `Rentang maksimal ${MAX_RANGE_DAYS} hari.`,
};

/**
 * A hand-picked range. Returns a PeriodError rather than quietly falling back
 * to 30 days: a client who asked for August and silently received "the last
 * month" would take away wrong numbers and never know it.
 */
export function periodFromRange(
  from: string,
  to: string,
  now: Date = new Date(),
): Period | { error: PeriodError } {
  const start = jakartaMidnight(from);
  const startOfTo = jakartaMidnight(to);
  if (!start || !startOfTo) return { error: "format" };
  if (start.getTime() > startOfTo.getTime()) return { error: "order" };

  // `to` is inclusive: the window runs to the end of that Jakarta day.
  const end = new Date(startOfTo.getTime() + DAY_MS);
  if (start.getTime() > now.getTime()) return { error: "future" };

  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (days > MAX_RANGE_DAYS) return { error: "too_long" };

  return {
    start,
    // Never report beyond now: a range ending today should compare against the
    // data that exists, not against an empty rest-of-day.
    end: end.getTime() > now.getTime() ? now : end,
    days,
    label: `${fmt(start)} – ${fmt(new Date(end.getTime() - DAY_MS))}`,
    preset: false,
    from,
    to,
  };
}

/** The equally long window immediately before this one, for deltas. */
export function previousPeriod(period: Period): Period {
  const start = new Date(period.start.getTime() - period.days * DAY_MS);
  return {
    start,
    end: period.start,
    days: period.days,
    label: "periode sebelumnya",
    preset: period.preset,
  };
}

/**
 * Reads a period out of query params. `?from=&to=` wins over `?days=`; an
 * invalid range surfaces as an error the caller turns into a 400 or an inline
 * message, never as a silent default.
 */
export function readPeriod(
  params: URLSearchParams,
  now: Date = new Date(),
): Period | { error: PeriodError } {
  const from = params.get("from");
  const to = params.get("to");
  if (from || to) {
    if (!from || !to) return { error: "format" };
    return periodFromRange(from, to, now);
  }
  return periodFromDays(Number(params.get("days")), now);
}

export function isPeriodError(
  value: Period | { error: PeriodError },
): value is { error: PeriodError } {
  return "error" in value;
}

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

/**
 * The page-side counterpart to readPeriod(). Server components get a plain
 * object rather than URLSearchParams, and an invalid range should render an
 * explanation next to a working 30-day view rather than blow up the route --
 * so this always returns a usable period, plus the message to show.
 */
export function readPeriodFromParams(
  params: SearchParams,
  now: Date = new Date(),
): { period: Period; error: string | null } {
  const search = new URLSearchParams();
  for (const key of ["days", "from", "to"]) {
    const value = one(params[key]);
    if (value) search.set(key, value);
  }
  const result = readPeriod(search, now);
  if (isPeriodError(result)) {
    return { period: periodFromDays(30, now), error: PERIOD_ERROR_MESSAGE[result.error] };
  }
  return { period: result, error: null };
}
