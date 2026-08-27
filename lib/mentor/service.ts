// Composition layer for the Mentor AI page: reads the user's latest report,
// turns it into three module picks, and manages the cached AI note.
//
// Server-only.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { jakartaDayIndex, type ReportSignals } from "@/lib/drills/plan";
import { writeMentorNote, type MentorNote } from "@/lib/gemini/mentor-note";
import { mentorPicks, type MentorPick } from "./plan";

/** Modules a pick can resolve to, with the presentation facts the cards need. */
export type MentorModule = {
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
};

export type MentorContext = {
  reportId: string | null;
  reportedAt: string | null;
  latestScore: number | null;
  signals: ReportSignals | null;
  picks: MentorPick[];
  modules: Record<string, MentorModule>;
};

const SIGNAL_COLUMNS =
  "id, created_at, overall_score, confidence_score, clarity_score, " +
  "structure_score, intonation_score, wpm, filler_word_count";

/**
 * Everything the page needs except the AI prose. Cheap: two selects, no model
 * call, so it is safe to run on every render.
 */
export async function loadMentorContext(
  supabase: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<MentorContext> {
  const [{ data: report }, { data: allModules }] = await Promise.all([
    supabase
      .from("reports")
      .select(
        `${SIGNAL_COLUMNS}, next_module:practice_modules!reports_next_step_module_id_fkey(slug)`,
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("practice_modules")
      .select("slug, title, category, difficulty, duration_minutes"),
  ]);

  const modules: Record<string, MentorModule> = {};
  for (const m of allModules ?? []) modules[m.slug] = m as MentorModule;

  const signals: ReportSignals | null = report
    ? {
        confidence_score: report.confidence_score,
        clarity_score: report.clarity_score,
        structure_score: report.structure_score,
        intonation_score: report.intonation_score,
        wpm: report.wpm,
        filler_word_count: report.filler_word_count,
      }
    : null;

  const nextModule = report?.next_module as { slug: string } | null | undefined;

  return {
    reportId: report?.id ?? null,
    reportedAt: report?.created_at ?? null,
    latestScore: report?.overall_score ?? null,
    signals,
    picks: mentorPicks(
      signals,
      nextModule?.slug ?? null,
      jakartaDayIndex(now),
      new Set(Object.keys(modules)),
    ),
    modules,
  };
}

/**
 * Scopes a query to one (user, source report) pair. `report_id` is nullable
 * for users with no analysed recording yet, and `.eq(col, null)` matches
 * nothing in SQL -- that row is only reachable through `.is(col, null)`.
 */
function scopeToPlan<T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(
  query: T,
  userId: string,
  reportId: string | null,
): T {
  const scoped = query.eq("user_id", userId);
  return reportId ? scoped.eq("report_id", reportId) : scoped.is("report_id", null);
}

/**
 * The cached note for this exact (user, report, module set). The slug check
 * matters: the picks rotate daily within a category, so a note written
 * yesterday can describe modules that are no longer on screen.
 */
export async function readCachedNote(
  userId: string,
  reportId: string | null,
  slugs: string[],
): Promise<MentorNote | null> {
  const supabase = createServiceRoleClient();
  const { data } = await scopeToPlan(
    supabase.from("mentor_plans").select("slugs, payload"),
    userId,
    reportId,
  ).maybeSingle();

  if (!data) return null;
  const cachedSlugs = (data.slugs as string[] | null) ?? [];
  if (cachedSlugs.join(",") !== slugs.join(",")) return null;
  return data.payload as MentorNote;
}

/**
 * Generates the note and stores it. Throws when Gemini is unavailable -- the
 * caller renders template copy instead, so the page degrades in tone, not in
 * usefulness.
 */
export async function generateMentorNote(
  userId: string,
  context: MentorContext,
): Promise<MentorNote> {
  const slugs = context.picks.map((p) => p.slug);

  // Aggregates and module titles only. No transcript, ever.
  const facts = {
    punya_data: context.signals !== null,
    skor_terakhir: context.latestScore,
    metrik: context.signals
      ? {
          kepercayaan_diri: context.signals.confidence_score,
          kejelasan: context.signals.clarity_score,
          struktur: context.signals.structure_score,
          intonasi: context.signals.intonation_score,
          kata_per_menit: context.signals.wpm,
          jumlah_kata_pengisi: context.signals.filler_word_count,
        }
      : null,
    modul_terpilih: context.picks.map((p, i) => ({
      urutan: i + 1,
      slug: p.slug,
      judul: context.modules[p.slug]?.title ?? p.slug,
      kategori: p.category,
      dipilih_karena:
        p.reason === "next_step"
          ? "rekomendasi langsung dari rapor analisis terakhir"
          : p.reason === "weak_signal"
            ? "kategori dengan skor terlemah berikutnya"
            : "rotasi berimbang karena belum ada kelemahan menonjol",
      bukti_angka: p.evidence,
    })),
  };

  const note = await writeMentorNote(facts, slugs);

  const supabase = createServiceRoleClient();
  // Delete-then-insert rather than upsert: the uniqueness rule is an
  // expression index (user_id, coalesce(report_id, ...)) and PostgREST's
  // on_conflict can only name plain columns. Writes happen once per report,
  // so the extra round trip costs nothing, and a lost race just means the
  // unique index rejects the second insert -- which the caller ignores.
  await scopeToPlan(
    supabase.from("mentor_plans").delete(),
    userId,
    context.reportId,
  );
  await supabase.from("mentor_plans").insert({
    user_id: userId,
    report_id: context.reportId,
    slugs,
    payload: note as unknown as Database["public"]["Tables"]["mentor_plans"]["Insert"]["payload"],
  });

  return note;
}
