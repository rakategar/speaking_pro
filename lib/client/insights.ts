import { createHash } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  listParticipants,
  orgOverview,
  orgSessionPoints,
  type OrgOverview,
  type ParticipantRow,
} from "@/lib/client/analytics";
import { forecastScores, riskFlags, type Forecast } from "@/lib/client/forecast";
import {
  writeCohortNarrative,
  type CohortNarrative,
} from "@/lib/gemini/cohort-narrative";

// Builds the aggregate picture the AI narrative reasons over, and caches the
// result. Shared by /api/client/insights and the PDF route so the dashboard
// and the printed report never disagree with each other.

const FORECAST_HORIZON_DAYS = 30;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REGENERATE_COOLDOWN_MS = 60 * 60 * 1000;

export type CohortFacts = {
  periode_hari: number;
  jumlah_peserta: number;
  peserta_aktif: number;
  peserta_tidak_aktif: number;
  total_sesi: number;
  total_drill: number;
  total_menit: number;
  rata_rata: OrgOverview["averages"];
  rata_rata_periode_sebelumnya: OrgOverview["previousAverages"];
  tren_harian: { tanggal: string; sesi: number; menit: number; skor: number | null }[];
  peserta_terbaik: { nama: string; skor: number | null; sesi: number }[];
  peserta_perlu_perhatian: { nama: string; skor: number | null; sesi: number; alasan: string[] }[];
  proyeksi: Forecast;
};

export type CohortAnalysis = {
  overview: OrgOverview;
  participants: ParticipantRow[];
  forecast: Forecast;
  risky: { row: ParticipantRow; flags: string[] }[];
  facts: CohortFacts;
  factsHash: string;
};

/** Everything the dashboard, the PDF and the AI all read from. */
export async function analyseCohort(
  orgId: string,
  days: number,
  now = new Date(),
): Promise<CohortAnalysis> {
  const [overview, participants, points] = await Promise.all([
    orgOverview(orgId, days, now),
    listParticipants(orgId, days, now),
    orgSessionPoints(orgId, days, now),
  ]);

  const forecast = forecastScores(points, FORECAST_HORIZON_DAYS, now);

  const risky = participants
    .map((row) => ({ row, flags: riskFlags(row, null, now) }))
    .filter((r) => r.flags.length > 0);

  const ranked = [...participants]
    .filter((p) => p.avgOverall != null)
    .sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));

  const label = (p: ParticipantRow) => p.name ?? p.email;

  const facts: CohortFacts = {
    periode_hari: days,
    jumlah_peserta: overview.participants,
    peserta_aktif: overview.activeParticipants,
    peserta_tidak_aktif: participants.filter((p) => p.status === "tidak aktif").length,
    total_sesi: overview.sessions,
    total_drill: overview.drills,
    total_menit: overview.minutes,
    rata_rata: overview.averages,
    rata_rata_periode_sebelumnya: overview.previousAverages,
    // Only days with activity: a month of mostly-empty rows is prompt padding
    // that buys nothing and costs tokens.
    tren_harian: overview.daily
      .filter((d) => d.sessions > 0 || d.drills > 0)
      .map((d) => ({
        tanggal: d.date,
        sesi: d.sessions,
        menit: d.minutes,
        skor: d.avgOverall,
      })),
    peserta_terbaik: ranked.slice(0, 3).map((p) => ({
      nama: label(p),
      skor: p.avgOverall,
      sesi: p.sessions,
    })),
    peserta_perlu_perhatian: risky.slice(0, 5).map((r) => ({
      nama: label(r.row),
      skor: r.row.avgOverall,
      sesi: r.row.sessions,
      alasan: r.flags,
    })),
    proyeksi: forecast,
  };

  return {
    overview,
    participants,
    forecast,
    risky,
    facts,
    factsHash: createHash("sha256").update(JSON.stringify(facts)).digest("hex"),
  };
}

export type CachedNarrative = {
  narrative: CohortNarrative | null;
  generatedAt: string | null;
  /** Set when the narrative could not be produced; the numbers still render. */
  error?: string;
};

/**
 * Returns the cached narrative when the facts are unchanged and fresh.
 *
 * Two separate brakes, because this is the one place in the product where a
 * button a client can click costs money per press: the facts hash stops
 * re-running on data that has not moved, and the cooldown stops a forced
 * regenerate from being spammed.
 */
export async function getCohortNarrative(
  orgId: string,
  days: number,
  analysis: CohortAnalysis,
  options: { force?: boolean; cacheOnly?: boolean } = {},
): Promise<CachedNarrative> {
  const supabase = createServiceRoleClient();

  const { data: cached } = await supabase
    .from("client_ai_reports")
    .select("payload, facts_hash, created_at")
    .eq("client_org_id", orgId)
    .eq("period_days", days)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const age = cached ? Date.now() - new Date(cached.created_at).getTime() : Infinity;

  // cacheOnly: take whatever narrative already exists, however old, and never
  // start a paid generation. The PDF download uses this -- a client clicking
  // "unduh" is asking for a file, not authorising a model call.
  if (options.cacheOnly) {
    return {
      narrative: (cached?.payload as CohortNarrative) ?? null,
      generatedAt: cached?.created_at ?? null,
    };
  }

  if (!options.force) {
    if (cached && cached.facts_hash === analysis.factsHash && age < CACHE_MAX_AGE_MS) {
      return {
        narrative: cached.payload as CohortNarrative,
        generatedAt: cached.created_at,
      };
    }
  } else if (cached && age < REGENERATE_COOLDOWN_MS) {
    const minutes = Math.ceil((REGENERATE_COOLDOWN_MS - age) / 60000);
    return {
      narrative: cached.payload as CohortNarrative,
      generatedAt: cached.created_at,
      error: `Analisis baru bisa dibuat ulang dalam ${minutes} menit.`,
    };
  }

  try {
    const narrative = await writeCohortNarrative(
      analysis.facts as unknown as Record<string, unknown>,
    );
    const createdAt = new Date().toISOString();
    await supabase.from("client_ai_reports").insert({
      client_org_id: orgId,
      period_days: days,
      payload: narrative,
      facts_hash: analysis.factsHash,
      created_at: createdAt,
    });
    return { narrative, generatedAt: createdAt };
  } catch (error) {
    // Never lose the page over prose. Fall back to the last narrative we have,
    // even a stale one, and say so.
    console.error("[cohort-insights] narrative failed:", error);
    return {
      narrative: (cached?.payload as CohortNarrative) ?? null,
      generatedAt: cached?.created_at ?? null,
      error:
        "Analisis AI belum bisa dibuat saat ini. Semua angka di bawah tetap akurat.",
    };
  }
}
