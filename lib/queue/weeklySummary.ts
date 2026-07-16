// Weekly summary PDFs for Premium subscribers. Runs from the same 5-minute
// gate as sendDailyReminders() in worker.ts. Timing is anchored to each
// user's personal subscription_started_at (day 7, 14, 21...), not a shared
// calendar date -- see lib/trial/status.ts's trialDayIndex for the same
// per-user-anchor pattern this mirrors.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { jakartaDayIndex } from "@/lib/drills/plan";
import { renderWeeklySummaryPdf } from "@/lib/summary/pdf";
import { sendPushToUser } from "@/lib/push/send";

export async function generateWeeklySummaries() {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const todayIndex = jakartaDayIndex(now);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, streak_count, subscription_started_at")
    .eq("subscription_tier", "premium")
    .not("subscription_started_at", "is", null);

  for (const profile of profiles ?? []) {
    const startedAt = new Date(profile.subscription_started_at!);
    const daysSinceStart = todayIndex - jakartaDayIndex(startedAt);
    if (daysSinceStart <= 0 || daysSinceStart % 7 !== 0) continue;
    const weekIndex = daysSinceStart / 7;

    const { data: existing } = await supabase
      .from("weekly_summaries")
      .select("id")
      .eq("user_id", profile.id)
      .eq("week_index", weekIndex)
      .maybeSingle();
    if (existing) continue;

    const periodStart = new Date(
      startedAt.getTime() + (weekIndex - 1) * 7 * 86_400_000,
    );
    const periodEnd = new Date(startedAt.getTime() + weekIndex * 7 * 86_400_000);

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

    const averages = scored.length
      ? {
          overall: avg(scored.map((s) => s.overall_score)),
          confidence: avg(scored.map((s) => s.confidence_score)),
          clarity: avg(scored.map((s) => s.clarity_score)),
          structure: avg(scored.map((s) => s.structure_score)),
          intonation: avg(scored.map((s) => s.intonation_score)),
          wpm: avg(scored.map((s) => s.wpm)),
          fillerWordCount: avg(scored.map((s) => s.filler_word_count)),
        }
      : null;

    const pdfBuffer = await renderWeeklySummaryPdf({
      userName: profile.full_name || "Pengguna",
      weekIndex,
      periodStart,
      periodEnd,
      sessionCount: recordings?.length ?? 0,
      streakCount: profile.streak_count,
      averages,
    });

    const storagePath = `${profile.id}/${weekIndex}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("weekly-summaries")
      .upload(storagePath, pdfBuffer, { contentType: "application/pdf" });
    if (uploadError) {
      console.error(
        `[weeklySummary] upload failed for user ${profile.id} week ${weekIndex}: ${uploadError.message}`,
      );
      continue;
    }

    await supabase.from("weekly_summaries").insert({
      user_id: profile.id,
      week_index: weekIndex,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      storage_path: storagePath,
      session_count: recordings?.length ?? 0,
    });

    await sendPushToUser(profile.id, {
      title: "Ringkasan mingguan siap 📄",
      body: "Laporan latihan mingguan Anda sudah bisa diunduh.",
      url: "/summaries",
      icon: "/stickers/faisal/celebrating.png",
    });

    console.log(`[weeklySummary] generated week ${weekIndex} for user ${profile.id}`);
  }
}
