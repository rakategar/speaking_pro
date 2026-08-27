/**
 * Which three modules the "Mentor AI" page recommends, and why.
 *
 * Deliberately deterministic and free: the picks come from report numbers the
 * analysis pipeline already computed, so they are instant, identical on every
 * render, and can never contradict the scores printed next to them. The AI's
 * job (lib/gemini/mentor-note.ts) is to explain these picks -- never to make
 * them.
 */

import {
  ALL_CATEGORIES,
  POOLS,
  WEAK_THRESHOLD,
  flaggedCategories,
  type ReportSignals,
} from "@/lib/drills/plan";

export const MENTOR_PICK_COUNT = 3;

export type MentorReason = "next_step" | "weak_signal" | "balanced";

export type MentorEvidence = {
  /** Human-readable metric name, e.g. "Kejelasan artikulasi". */
  metric: string;
  value: number;
  threshold: number;
  /** "below" = lower is worse (scores); "above" = higher is worse (wpm, filler). */
  direction: "below" | "above";
};

export type MentorPick = {
  slug: string;
  category: string;
  reason: MentorReason;
  /** The number that triggered this pick -- shown as proof, not as a claim. */
  evidence: MentorEvidence | null;
};

/** The category whose drill pool contains this slug, or null. */
export function categoryOfSlug(slug: string): string | null {
  for (const [category, pool] of Object.entries(POOLS)) {
    if (pool.includes(slug)) return category;
  }
  return null;
}

/** The measurement behind a flagged category, for the evidence chip. */
export function evidenceFor(
  category: string,
  s: ReportSignals | null,
): MentorEvidence | null {
  if (!s) return null;
  const below = (metric: string, value: number | null): MentorEvidence | null =>
    value === null
      ? null
      : { metric, value, threshold: WEAK_THRESHOLD, direction: "below" };

  switch (category) {
    case "Artikulasi":
      return below("Kejelasan artikulasi", s.clarity_score);
    case "Kepercayaan Diri":
      return below("Kepercayaan diri", s.confidence_score);
    case "Intonasi":
      return below("Intonasi", s.intonation_score);
    case "Struktur":
      return below("Struktur bahasa", s.structure_score);
    case "Tempo":
      return s.wpm === null
        ? null
        : { metric: "Kecepatan bicara", value: s.wpm, threshold: 150, direction: "above" };
    case "Filler Words":
      return s.filler_word_count === null
        ? null
        : { metric: "Kata pengisi", value: s.filler_word_count, threshold: 5, direction: "above" };
    default:
      return null;
  }
}

/**
 * Exactly three distinct modules for this user, today.
 *
 * Slot 1 is whatever the latest report already routes the user to
 * (reports.next_step_module_id) -- if the report said AIUEO, AIUEO leads the
 * page. Slots 2-3 walk down the remaining flagged categories, worst first.
 * A user with no report at all gets a balanced rotation instead of an empty
 * page.
 *
 * `availableSlugs`, when given, restricts picks to modules that actually exist
 * in practice_modules, so the page can never render a card that leads nowhere.
 */
export function mentorPicks(
  signals: ReportSignals | null,
  nextStepSlug: string | null,
  dayIndex: number,
  availableSlugs?: Set<string>,
): MentorPick[] {
  const exists = (slug: string) => !availableSlugs || availableSlugs.has(slug);
  // Evidence is only evidence when the metric actually crossed its threshold.
  // A balanced pick whose category scores 77/100 must NOT print "77 — masih di
  // bawah 70": the number is real, the claim about it would be false.
  const flagged = new Set(flaggedCategories(signals));
  const picks: MentorPick[] = [];
  const usedSlugs = new Set<string>();
  const usedCategories = new Set<string>();

  const push = (slug: string, category: string, reason: MentorReason) => {
    if (usedSlugs.has(slug) || !exists(slug)) return false;
    usedSlugs.add(slug);
    usedCategories.add(category);
    picks.push({
      slug,
      category,
      reason,
      evidence: flagged.has(category) ? evidenceFor(category, signals) : null,
    });
    return true;
  };

  // Slot 1: the module the report itself points at.
  if (nextStepSlug) {
    const category = categoryOfSlug(nextStepSlug);
    // free-recording is a valid next step but belongs to no drill category;
    // treat it as Struktur, the dimension it is scored on.
    push(nextStepSlug, category ?? "Struktur", "next_step");
  }

  // Rotates within a category so the same weakness does not serve the
  // identical drill every single day.
  const fromPool = (category: string): string | null => {
    const pool = POOLS[category] ?? [];
    for (let i = 0; i < pool.length; i += 1) {
      const slug = pool[(dayIndex + i) % pool.length];
      if (!usedSlugs.has(slug) && exists(slug)) return slug;
    }
    return null;
  };

  // Slots 2-3: the remaining weaknesses, worst first.
  for (const category of flagged) {
    if (picks.length >= MENTOR_PICK_COUNT) break;
    if (usedCategories.has(category)) continue;
    const slug = fromPool(category);
    if (slug) push(slug, category, "weak_signal");
  }

  // Nothing flagged (or not enough of it): fill from the balanced rotation.
  for (let i = 0; picks.length < MENTOR_PICK_COUNT && i < ALL_CATEGORIES.length * 2; i += 1) {
    const category = ALL_CATEGORIES[(dayIndex + i) % ALL_CATEGORIES.length];
    if (usedCategories.has(category)) continue;
    const slug = fromPool(category);
    if (slug) push(slug, category, "balanced");
  }

  // Last resort, only reachable when availableSlugs is very small: allow a
  // second module from an already-used category rather than returning fewer
  // than three cards.
  if (picks.length < MENTOR_PICK_COUNT) {
    for (const category of ALL_CATEGORIES) {
      if (picks.length >= MENTOR_PICK_COUNT) break;
      const slug = fromPool(category);
      if (slug) push(slug, category, "balanced");
    }
  }

  return picks;
}

/**
 * The fallback copy used when Gemini is unavailable -- deliberately concrete
 * (it quotes the same evidence the card shows) so a model outage degrades the
 * page's tone, not its usefulness.
 */
export function fallbackReason(pick: MentorPick): string {
  if (pick.evidence) {
    const { metric, value, threshold, direction } = pick.evidence;
    return direction === "below"
      ? `${metric} Anda ${value} — masih di bawah ${threshold}. Modul ini melatih tepat area itu.`
      : `${metric} Anda ${value}, di atas batas wajar ${threshold}. Modul ini melatih tepat area itu.`;
  }
  if (pick.reason === "next_step") {
    return "Modul ini yang direkomendasikan rapor analisis terakhir Anda.";
  }
  return `Melatih ${pick.category.toLowerCase()} untuk menjaga fondasi bicara Anda tetap seimbang.`;
}
