import { createClient } from "@/lib/supabase/server";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";
import { getTrialStatus } from "@/lib/trial/status";
import { TopAppBar } from "@/components/layout/TopAppBar";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Independent of each other -- run together instead of as a waterfall.
  const [{ data: modules }, trialStatus] = await Promise.all([
    supabase
      .from("practice_modules")
      .select("id, slug, title, category, difficulty, duration_minutes, is_ai_recommended")
      .order("created_at"),
    user ? getTrialStatus(supabase, user.id) : Promise.resolve(null),
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

  return (
    <div className="w-full max-w-md mx-auto relative">
      <TopAppBar variant="transactional" title="Practice Library" showBack={false} />

      <main className="pt-32 px-margin-mobile w-full">
        <LibraryBrowser modules={modules ?? []} lockedSlugs={lockedSlugs} />
      </main>
    </div>
  );
}
