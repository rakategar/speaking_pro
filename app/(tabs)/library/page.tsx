import { createClient } from "@/lib/supabase/server";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import { MentorAiView, type MentorCard } from "@/components/library/MentorAiView";
import { loadMentorContext, readCachedNote } from "@/lib/mentor/service";
import { getTrialStatus } from "@/lib/trial/status";
import { TopAppBar } from "@/components/layout/TopAppBar";

export const dynamic = "force-dynamic";

export default async function MentorAiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Independent of each other -- run together instead of as a waterfall.
  const [{ data: modules }, trialStatus, mentor] = await Promise.all([
    supabase
      .from("practice_modules")
      .select("id, slug, title, category, difficulty, duration_minutes, is_ai_recommended")
      .order("created_at"),
    user ? getTrialStatus(supabase, user.id) : Promise.resolve(null),
    loadMentorContext(supabase),
  ]);

  const lockedSlugs =
    trialStatus?.tier === "free"
      ? new Set(
          (modules ?? [])
            .map((m) => m.slug)
            .filter(
              (slug) =>
                slug !== "free-recording" &&
                !trialStatus.unlockedSlugs.has(slug),
            ),
        )
      : new Set<string>();

  // Read-only here: generating the note can take tens of seconds and must not
  // block the first paint. MentorAiView asks /api/mentor for it when the cache
  // is empty, which is at most once per report.
  const cachedNote = user
    ? await readCachedNote(
        user.id,
        mentor.reportId,
        mentor.picks.map((p) => p.slug),
      )
    : null;

  const cards: MentorCard[] = mentor.picks.map((p) => ({
    ...p,
    module: mentor.modules[p.slug] ?? null,
    locked: lockedSlugs.has(p.slug),
  }));

  const reportedAtLabel = mentor.reportedAt
    ? new Date(mentor.reportedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="w-full max-w-md mx-auto relative">
      <TopAppBar variant="transactional" title="Mentor AI" showBack={false} />

      <main className="pt-32 px-margin-mobile w-full stagger">
        <MentorAiView
          cards={cards}
          cachedNote={cachedNote}
          latestScore={mentor.latestScore}
          reportedAtLabel={reportedAtLabel}
          hasReport={mentor.reportId !== null}
        />

        <div className="mt-8">
          <LibraryBrowser modules={modules ?? []} lockedSlugs={lockedSlugs} />
        </div>
      </main>
    </div>
  );
}
