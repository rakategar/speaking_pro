import { NextResponse, type NextRequest } from "next/server";
import { requireClientSession } from "@/lib/client/session";
import { participantDetail } from "@/lib/client/analytics";
import { analyseCohort, getCohortNarrative } from "@/lib/client/insights";
import { forecastScores, riskFlags } from "@/lib/client/forecast";
import {
  renderCohortReport,
  renderParticipantReport,
} from "@/lib/client/reportPdf";

export const runtime = "nodejs";
export const maxDuration = 120;

const ALLOWED_DAYS = [7, 30, 90];
const DAY_MS = 86_400_000;
const FORECAST_HORIZON_DAYS = 30;

function readDays(raw: string | null): number {
  const n = Number(raw);
  return ALLOWED_DAYS.includes(n) ? n : 30;
}

// Slugified so the filename is safe on every OS the client might save it to.
function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "laporan"
  );
}

// GET /api/client/reports?days=30[&userId=...] -- streams a PDF.
//
// Rendered on demand and never written to Storage: no extra bucket, no extra
// policy, and no stale file still readable after the organization is deleted.
export async function GET(request: NextRequest) {
  const session = await requireClientSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const days = readDays(url.searchParams.get("days"));
  const userId = url.searchParams.get("userId");
  const now = new Date();
  const periodStart = new Date(now.getTime() - days * DAY_MS);

  if (userId) {
    // participantDetail returns null for anyone outside this organization --
    // the membership check lives there, not here.
    const detail = await participantDetail(session.orgId, userId, days, now);
    if (!detail) {
      return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    }
    const forecast = forecastScores(detail.points, FORECAST_HORIZON_DAYS, now);
    const buffer = await renderParticipantReport({
      orgName: session.orgName,
      participant: detail.row,
      periodDays: days,
      periodStart,
      periodEnd: now,
      averages: detail.averages,
      previousAverages: detail.previousAverages,
      points: detail.points,
      forecast,
      flags: riskFlags(detail.row, forecast, now),
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rekap-${slug(detail.row.name ?? detail.row.email)}-${days}h.pdf"`,
      },
    });
  }

  const analysis = await analyseCohort(session.orgId, days, now);
  // Cache-only: a download must never trigger a paid model call. The client
  // asks for fresh prose explicitly, on the insights page.
  const { narrative } = await getCohortNarrative(session.orgId, days, analysis, {
    cacheOnly: true,
  }).catch(() => ({ narrative: null }));

  const buffer = await renderCohortReport({
    orgName: session.orgName,
    periodDays: days,
    periodStart,
    periodEnd: now,
    participants: analysis.participants,
    totals: {
      participants: analysis.overview.participants,
      activeParticipants: analysis.overview.activeParticipants,
      sessions: analysis.overview.sessions,
      drills: analysis.overview.drills,
      minutes: analysis.overview.minutes,
    },
    averages: analysis.overview.averages,
    previousAverages: analysis.overview.previousAverages,
    daily: analysis.overview.daily,
    forecast: analysis.forecast,
    risky: analysis.risky,
    narrative,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rekap-program-${slug(session.orgName)}-${days}h.pdf"`,
    },
  });
}
