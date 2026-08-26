import { NextResponse, type NextRequest } from "next/server";
import { requireClientSession } from "@/lib/client/session";
import { analyseCohort, getCohortNarrative } from "@/lib/client/insights";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_DAYS = [7, 30, 90];

function readDays(raw: string | null): number {
  const n = Number(raw);
  return ALLOWED_DAYS.includes(n) ? n : 30;
}

// POST /api/client/insights?days=30[&force=1] -- cohort narrative.
// POST rather than GET because it can trigger a paid model call; GET would
// invite prefetchers and caches to spend money on the client's behalf.
export async function POST(request: NextRequest) {
  const session = await requireClientSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = readDays(url.searchParams.get("days"));
  const force = url.searchParams.get("force") === "1";

  const analysis = await analyseCohort(session.orgId, days);
  const result = await getCohortNarrative(session.orgId, days, analysis, { force });

  return NextResponse.json({
    days,
    forecast: analysis.forecast,
    narrative: result.narrative,
    generatedAt: result.generatedAt,
    error: result.error ?? null,
  });
}
