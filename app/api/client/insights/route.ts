import { NextResponse, type NextRequest } from "next/server";
import { requireClientSession } from "@/lib/client/session";
import { analyseCohort, getCohortNarrative } from "@/lib/client/insights";
import { PERIOD_ERROR_MESSAGE, isPeriodError, readPeriod } from "@/lib/client/period";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/client/insights?days=30 or ?from=YYYY-MM-DD&to=YYYY-MM-DD
// [&force=1] -- cohort narrative.
// POST rather than GET because it can trigger a paid model call; GET would
// invite prefetchers and caches to spend money on the client's behalf.
export async function POST(request: NextRequest) {
  const session = await requireClientSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const period = readPeriod(url.searchParams);
  // A bad range is refused, never quietly turned into "the last 30 days": a
  // client who asked for August and silently got September would take away
  // wrong numbers without ever knowing.
  if (isPeriodError(period)) {
    return NextResponse.json(
      { error: PERIOD_ERROR_MESSAGE[period.error] },
      { status: 400 },
    );
  }
  const force = url.searchParams.get("force") === "1";

  const analysis = await analyseCohort(session.orgId, period);
  const result = await getCohortNarrative(session.orgId, period, analysis, { force });

  return NextResponse.json({
    days: period.days,
    period: period.label,
    forecast: analysis.forecast,
    narrative: result.narrative,
    generatedAt: result.generatedAt,
    error: result.error ?? null,
  });
}
