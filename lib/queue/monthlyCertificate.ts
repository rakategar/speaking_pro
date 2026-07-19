// One-time "1-month Premium program completion" certificate. Runs from the
// same 5-minute gate as generateWeeklySummaries() in worker.ts, anchored to
// the same subscription_started_at column -- but unlike the weekly digest,
// this fires once per user (unique(user_id) on monthly_certificates is the
// real guard) at the 30-day mark, not repeatedly every 7 days.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { jakartaDayIndex } from "@/lib/drills/plan";
import {
  renderMonthlyCertificatePdf,
  badgeTierFromScore,
} from "@/lib/summary/certificate";
import { notifyUser } from "@/lib/notifications/notify";

const PROGRAM_DAYS = 30;
const BADGE_ICON: Record<string, string> = {
  gold: "/stickers/faisal-v2/celebrating.png",
  silver: "/stickers/faisal-v2/thumbs-up.png",
  bronze: "/stickers/faisal-v2/tip-mic.png",
};

export async function generateMonthlyCertificates() {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const todayIndex = jakartaDayIndex(now);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, subscription_started_at, notif_digest")
    .eq("subscription_tier", "premium")
    .not("subscription_started_at", "is", null);

  for (const profile of profiles ?? []) {
    const startedAt = new Date(profile.subscription_started_at!);
    const daysSinceStart = todayIndex - jakartaDayIndex(startedAt);
    if (daysSinceStart < PROGRAM_DAYS) continue;

    const { data: existing } = await supabase
      .from("monthly_certificates")
      .select("id")
      .eq("user_id", profile.id)
      .maybeSingle();
    if (existing) continue;

    const periodStart = startedAt;
    const periodEnd = new Date(startedAt.getTime() + PROGRAM_DAYS * 86_400_000);

    const { data: recordings } = await supabase
      .from("recordings")
      .select("id, reports(overall_score, confidence_score, clarity_score, structure_score, intonation_score, wpm, filler_word_count)")
      .eq("user_id", profile.id)
      .gte("created_at", periodStart.toISOString())
      .lt("created_at", periodEnd.toISOString());

    const scored = (recordings ?? [])
      .map((r) => (Array.isArray(r.reports) ? r.reports[0] : r.reports))
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    const avg = (values: (number | null)[]) => {
      const nums = values.filter((v): v is number => v != null);
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
    };

    const overallAvg = scored.length ? avg(scored.map((s) => s.overall_score)) : null;
    const averages = scored.length
      ? {
          overall: overallAvg,
          confidence: avg(scored.map((s) => s.confidence_score)),
          clarity: avg(scored.map((s) => s.clarity_score)),
          structure: avg(scored.map((s) => s.structure_score)),
          intonation: avg(scored.map((s) => s.intonation_score)),
          wpm: avg(scored.map((s) => s.wpm)),
          fillerWordCount: avg(scored.map((s) => s.filler_word_count)),
        }
      : null;

    const badgeTier = badgeTierFromScore(overallAvg);

    const pdfBuffer = await renderMonthlyCertificatePdf({
      userName: profile.full_name || "Pengguna",
      periodStart,
      periodEnd,
      sessionCount: recordings?.length ?? 0,
      badgeTier,
      averages,
    });

    const storagePath = `${profile.id}/certificate.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("monthly-certificates")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf" });
    if (uploadError) {
      console.error(
        `[monthlyCertificate] upload failed for user ${profile.id}: ${uploadError.message}`,
      );
      continue;
    }

    await supabase.from("monthly_certificates").insert({
      user_id: profile.id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      storage_path: storagePath,
      session_count: recordings?.length ?? 0,
      average_score: overallAvg != null ? Math.round(overallAvg) : null,
      badge_tier: badgeTier,
    });

    // Certificate is always generated and stays on /summaries; the
    // "Ringkasan & Laporan" setting only suppresses the nudge.
    if (profile.notif_digest !== false) {
      await notifyUser(supabase, profile.id, {
        type: "certificate",
        title: "Sertifikat 1 Bulan siap 🏆",
        body: "Selamat! Sertifikat pencapaian 1 bulan Premium Anda sudah bisa diunduh.",
        url: "/summaries",
        icon: BADGE_ICON[badgeTier],
      });
    }

    console.log(`[monthlyCertificate] generated certificate for user ${profile.id} (${badgeTier})`);
  }
}
