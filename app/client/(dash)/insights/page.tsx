import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { analyseCohort, getCohortNarrative } from "@/lib/client/insights";
import { PeriodPicker } from "@/components/client/PeriodPicker";
import { InsightsPanel } from "@/components/client/InsightsPanel";

export const dynamic = "force-dynamic";

const ALLOWED_DAYS = [7, 30, 90];

function readDays(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return ALLOWED_DAYS.includes(n) ? n : 30;
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const days = readDays((await searchParams).days);
  const analysis = await analyseCohort(session.orgId, days);
  // Cache-only on page load: opening a page must never spend model tokens.
  // Producing a narrative is an explicit click, handled by InsightsPanel.
  const cached = await getCohortNarrative(session.orgId, days, analysis, {
    cacheOnly: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Analitik AI</h1>
          <p className="text-sm text-text-secondary">
            Pembacaan otomatis atas data {analysis.overview.participants} peserta
            selama {days} hari terakhir.
          </p>
        </div>
        <PeriodPicker days={days} />
      </div>

      <InsightsPanel
        days={days}
        initialNarrative={cached.narrative}
        initialGeneratedAt={cached.generatedAt}
        forecast={analysis.forecast}
        hasData={analysis.overview.sessions > 0}
      />
    </div>
  );
}
