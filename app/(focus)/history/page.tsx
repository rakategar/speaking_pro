import { createClient } from "@/lib/supabase/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { HistoryList } from "@/components/history/HistoryList";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: recordings } = await supabase
    .from("recordings")
    .select(
      "id, created_at, status, environment, duration_seconds, practice_modules(title, category), reports(overall_score)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const items = (recordings ?? []).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    status: r.status,
    environment: r.environment,
    duration_seconds: r.duration_seconds,
    module_title: r.practice_modules?.title ?? null,
    module_category: r.practice_modules?.category ?? null,
    overall_score: r.reports?.overall_score ?? null,
  }));

  return (
    <div className="min-h-screen bg-background">
      <TopAppBar variant="back" title="Riwayat Latihan" />
      <main className="pt-24 pb-16 px-margin-mobile max-w-lg mx-auto stagger">
        <HistoryList items={items} />
      </main>
    </div>
  );
}
