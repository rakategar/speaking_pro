/**
 * "Weekly Anchor → Daily Plan": derive the user's problem flags from their
 * latest AI report (already computed by the analysis pipeline — no extra AI
 * call), then map them to a deterministic 2-drill menu that rotates daily.
 */

export type ReportSignals = {
  confidence_score: number | null;
  clarity_score: number | null;
  structure_score: number | null;
  intonation_score: number | null;
  wpm: number | null;
  filler_word_count: number | null;
};

/** Drill slugs per problem category (matches practice_modules.category). */
const POOLS: Record<string, string[]> = {
  Artikulasi: ["aiueo-drill", "articulation-exercise", "pronunciation-practice"],
  Tempo: ["breathing-control", "pause-technique", "rhythm-training"],
  "Kepercayaan Diri": ["confidence-drill", "self-recording-practice", "guided-speaking"],
  Intonasi: ["dynamic-pitch", "vocal-variety", "emphasis-training", "energy-control"],
  "Filler Words": ["pause-mastery", "structured-thinking", "speaking-awareness"],
  Struktur: ["story-structure", "framework-speaking", "opening-closing"],
};

const ALL_CATEGORIES = Object.keys(POOLS);
const WEAK_THRESHOLD = 70;

/** Problem categories sorted by severity (worst first). */
export function flaggedCategories(s: ReportSignals | null): string[] {
  if (!s) return [];
  const flags: { cat: string; severity: number }[] = [];
  if (s.clarity_score !== null && s.clarity_score < WEAK_THRESHOLD)
    flags.push({ cat: "Artikulasi", severity: WEAK_THRESHOLD - s.clarity_score });
  if (s.wpm !== null && s.wpm > 150)
    flags.push({ cat: "Tempo", severity: (s.wpm - 150) / 2 });
  if (s.confidence_score !== null && s.confidence_score < WEAK_THRESHOLD)
    flags.push({ cat: "Kepercayaan Diri", severity: WEAK_THRESHOLD - s.confidence_score });
  if (s.intonation_score !== null && s.intonation_score < WEAK_THRESHOLD)
    flags.push({ cat: "Intonasi", severity: WEAK_THRESHOLD - s.intonation_score });
  if (s.filler_word_count !== null && s.filler_word_count >= 5)
    flags.push({ cat: "Filler Words", severity: s.filler_word_count * 3 });
  if (s.structure_score !== null && s.structure_score < WEAK_THRESHOLD)
    flags.push({ cat: "Struktur", severity: WEAK_THRESHOLD - s.structure_score });
  return flags.sort((a, b) => b.severity - a.severity).map((f) => f.cat);
}

export type PlannedDrill = { category: string; slug: string };

/**
 * Two drills for the given day. Personalized when the user has flags,
 * otherwise a balanced rotation across all six categories.
 * `dayIndex` = whole days since epoch in the user's timezone, so the menu
 * is stable for a calendar day and changes overnight.
 */
export function dailyPlan(
  signals: ReportSignals | null,
  dayIndex: number,
): PlannedDrill[] {
  const flagged = flaggedCategories(signals);
  const cats = flagged.length > 0 ? flagged : ALL_CATEGORIES;

  const c1 = cats[dayIndex % cats.length];
  const c2 = cats.length > 1 ? cats[(dayIndex + 1) % cats.length] : c1;

  const pick = (cat: string, salt: number): string => {
    const pool = POOLS[cat];
    return pool[(dayIndex + salt) % pool.length];
  };

  const first: PlannedDrill = { category: c1, slug: pick(c1, 0) };
  const second: PlannedDrill = { category: c2, slug: pick(c2, c1 === c2 ? 1 : 0) };
  return second.slug === first.slug
    ? [first, { category: c2, slug: pick(c2, 2) }]
    : [first, second];
}

/** Days since epoch for "now" in Asia/Jakarta. */
export function jakartaDayIndex(now: Date = new Date()): number {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now); // YYYY-MM-DD
  return Math.floor(new Date(`${ymd}T00:00:00Z`).getTime() / 86_400_000);
}

/** Start of today (Asia/Jakarta) as a Date, for "practiced today" queries. */
export function jakartaStartOfToday(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
  }).format(now);
  return new Date(`${ymd}T00:00:00+07:00`);
}
