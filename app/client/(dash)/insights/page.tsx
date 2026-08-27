import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { analyseCohort, getCohortNarrative } from "@/lib/client/insights";
import { readPeriodFromParams } from "@/lib/client/period";
import { PeriodPicker } from "@/components/client/PeriodPicker";
import { PeriodError } from "@/components/client/PeriodError";
import { InsightsPanel } from "@/components/client/InsightsPanel";

export const dynamic = "force-dynamic";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const { period, error: periodError } = readPeriodFromParams(await searchParams);
  const analysis = await analyseCohort(session.orgId, period);
  // Cache-only on page load: opening a page must never spend model tokens.
  // Producing a narrative is an explicit click, handled by InsightsPanel.
  const cached = await getCohortNarrative(session.orgId, period, analysis, {
    cacheOnly: true,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Analitik AI</h1>
          <p className="text-sm text-text-secondary">
            Pembacaan otomatis atas data {analysis.overview.participants} peserta
            selama periode {period.label}.
          </p>
        </div>
        <PeriodPicker period={period} />
      </div>

      <PeriodError message={periodError} />

      <InsightsPanel
        period={period}
        initialNarrative={cached.narrative}
        initialGeneratedAt={cached.generatedAt}
        forecast={analysis.forecast}
        hasData={analysis.overview.sessions > 0}
      />
    </div>
  );
}
