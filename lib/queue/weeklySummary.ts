// Weekly summary PDFs for Premium subscribers. Runs from the same 5-minute
// gate as sendDailyReminders() in worker.ts. Timing is anchored to each
// user's personal subscription_started_at (day 7, 14, 21...), not a shared
// calendar date -- see lib/trial/status.ts's trialDayIndex for the same
// per-user-anchor pattern this mirrors.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { jakartaDayIndex, flaggedCategories, dailyPlan } from "@/lib/drills/plan";
import {
  renderWeeklySummaryPdf,
  type MetricAverages,
  type SummarySession,
} from "@/lib/summary/pdf";
import {
  writeWeeklyNarrative,
  type WeeklyNarrative,
} from "@/lib/gemini/weekly-narrative";
import { WEEKLY_QUOTA_SECONDS } from "@/lib/recording/quota";
import { notifyUser } from "@/lib/notifications/notify";

// Client-side drill logs: a recordings row with no audio and no report. They
// are activity, but they are not analysed sessions, so the summary counts
// them separately instead of folding them into "Sesi Latihan" the way the
// first version of this job did.
const DRILL_STATUS = "drill_completed";

type ReportRow = {
  overall_score: number | null;
  confidence_score: number | null;
  clarity_score: number | null;
  structure_score: number | null;
  intonation_score: number | null;
  wpm: number | null;
  filler_word_count: number | null;
  ai_insights: unknown;
  coach_feedback: string | null;
};

type RecordingRow = {
  id: string;
  created_at: string;
  status: string;
  duration_seconds: number | null;
  reports: ReportRow | ReportRow[] | null;
  practice_modules: { title: string; category: string } | { title: string; category: string }[] | null;
};

const one = <T,>(v: T | T[] | null): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : v;

const avg = (values: (number | null)[]) => {
  const nums = values.filter((v): v is number => v != null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
};

function averagesOf(reports: ReportRow[]): MetricAverages | null {
  if (!reports.length) return null;
  return {
    overall: avg(reports.map((s) => s.overall_score)),
    confidence: avg(reports.map((s) => s.confidence_score)),
    clarity: avg(reports.map((s) => s.clarity_score)),
    structure: avg(reports.map((s) => s.structure_score)),
    intonation: avg(reports.map((s) => s.intonation_score)),
    wpm: avg(reports.map((s) => s.wpm)),
    fillerWordCount: avg(reports.map((s) => s.filler_word_count)),
  };
}

/** The strength/improvement bullets the per-session analysis already wrote. */
function insightTexts(reports: ReportRow[]) {
  const strengths: string[] = [];
  const improvements: string[] = [];
  for (const r of reports) {
    const insights = (r.ai_insights as { insights?: unknown } | null)?.insights;
    if (!Array.isArray(insights)) continue;
    for (const i of insights as { type?: string; text?: string }[]) {
      if (typeof i?.text !== "string") continue;
      if (i.type === "strength") strengths.push(i.text);
      else if (i.type === "improvement") improvements.push(i.text);
    }
  }
  // Cap what reaches the prompt -- a heavy week could otherwise send dozens.
  return { strengths: strengths.slice(0, 12), improvements: improvements.slice(0, 12) };
}

const SELECT_RECORDINGS =
  "id, created_at, status, duration_seconds, " +
  "reports(overall_score, confidence_score, clarity_score, structure_score, intonation_score, wpm, filler_word_count, ai_insights, coach_feedback), " +
  "practice_modules(title, category)";

export async function generateWeeklySummaries() {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const todayIndex = jakartaDayIndex(now);

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, full_name, occupation, onboarding_answers, streak_count, topup_seconds_balance, subscription_started_at, notif_digest",
    )
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

    const startedMs = startedAt.getTime();
    const periodStart = new Date(startedMs + (weekIndex - 1) * 7 * 86_400_000);
    const periodEnd = new Date(startedMs + weekIndex * 7 * 86_400_000);
    const prevStart = new Date(periodStart.getTime() - 7 * 86_400_000);

    const startedTs = Date.now();

    // This week, and the week before it for the deltas.
    const [{ data: thisWeek }, { data: lastWeek }, { data: history }] =
      await Promise.all([
        supabase
          .from("recordings")
          .select(SELECT_RECORDINGS)
          .eq("user_id", profile.id)
          .gte("created_at", periodStart.toISOString())
          .lt("created_at", periodEnd.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("recordings")
          .select(SELECT_RECORDINGS)
          .eq("user_id", profile.id)
          .gte("created_at", prevStart.toISOString())
          .lt("created_at", periodStart.toISOString()),
        supabase
          .from("score_history")
          .select("overall_score, week_label, recorded_at")
          .eq("user_id", profile.id)
          .order("recorded_at", { ascending: true }),
      ]);

    const rows = (thisWeek ?? []) as unknown as RecordingRow[];
    const prevRows = (lastWeek ?? []) as unknown as RecordingRow[];

    const drills = rows.filter((r) => r.status === DRILL_STATUS);
    const recorded = rows.filter((r) => r.status !== DRILL_STATUS);

    const sessions: SummarySession[] = recorded.map((r) => {
      const rep = one(r.reports);
      const mod = one(r.practice_modules);
      return {
        date: r.created_at,
        moduleTitle: mod?.title ?? null,
        category: mod?.category ?? null,
        durationSeconds: r.duration_seconds,
        overall: rep?.overall_score ?? null,
        clarity: rep?.clarity_score ?? null,
        structure: rep?.structure_score ?? null,
        confidence: rep?.confidence_score ?? null,
        intonation: rep?.intonation_score ?? null,
        wpm: rep?.wpm ?? null,
        filler: rep?.filler_word_count ?? null,
      };
    });

    const scored = recorded
      .map((r) => one(r.reports))
      .filter((r): r is ReportRow => Boolean(r));
    const prevScored = prevRows
      .filter((r) => r.status !== DRILL_STATUS)
      .map((r) => one(r.reports))
      .filter((r): r is ReportRow => Boolean(r));

    const averages = averagesOf(scored);
    const previousAverages = averagesOf(prevScored);

    // Which of the seven days in this user's personal week saw any activity.
    const activeDays = Array.from({ length: 7 }, (_, i) => {
      const dayStart = periodStart.getTime() + i * 86_400_000;
      const dayEnd = dayStart + 86_400_000;
      return rows.some((r) => {
        const t = new Date(r.created_at).getTime();
        return t >= dayStart && t < dayEnd;
      });
    });

    // Drill rows never spend quota (see consume_recording_quota), so they are
    // excluded from what counts as quota used here too.
    const quotaUsedSeconds = recorded.reduce(
      (s, r) => s + (r.duration_seconds ?? 0),
      0,
    );
    const totalSeconds = rows.reduce((s, r) => s + (r.duration_seconds ?? 0), 0);

    // Per-week averages across the user's whole history, for the trend chart.
    const byWeek = new Map<string, number[]>();
    for (const h of history ?? []) {
      if (h.overall_score == null) continue;
      const list = byWeek.get(h.week_label) ?? [];
      list.push(h.overall_score);
      byWeek.set(h.week_label, list);
    }
    const weeklyTrend = [...byWeek.entries()]
      .slice(-8)
      .map(([label, values]) => ({
        label,
        value: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10,
      }));

    // Reuse the daily-drill planner rather than inventing a second notion of
    // "what is this user weakest at".
    const latest = scored[scored.length - 1] ?? null;
    const signals = latest
      ? {
          confidence_score: latest.confidence_score,
          clarity_score: latest.clarity_score,
          structure_score: latest.structure_score,
          intonation_score: latest.intonation_score,
          wpm: latest.wpm,
          filler_word_count: latest.filler_word_count,
        }
      : null;
    const focusCategories = flaggedCategories(signals);
    const planned = dailyPlan(signals, todayIndex);

    const { data: plannedModules } = await supabase
      .from("practice_modules")
      .select("slug, title, category")
      .in("slug", planned.map((p) => p.slug));
    const recommendedDrills = planned.map((p) => ({
      category: p.category,
      title:
        plannedModules?.find((m) => m.slug === p.slug)?.title ??
        p.slug.replace(/-/g, " "),
    }));

    // The narrative is best-effort: a Gemini outage must never cost the user
    // their report, so a failure just drops the prose and keeps every number.
    let narrative: WeeklyNarrative | null = null;
    if (scored.length > 0) {
      const { strengths, improvements } = insightTexts(scored);
      try {
        narrative = await writeWeeklyNarrative({
          nama: profile.full_name || "Pengguna",
          profesi: profile.occupation ?? null,
          jawaban_onboarding: profile.onboarding_answers ?? null,
          minggu_ke: weekIndex,
          periode: `${periodStart.toISOString().slice(0, 10)} s/d ${periodEnd
            .toISOString()
            .slice(0, 10)}`,
          jumlah_sesi_direkam: recorded.length,
          jumlah_drill: drills.length,
          total_menit_bicara: Math.round((totalSeconds / 60) * 10) / 10,
          hari_aktif: activeDays.filter(Boolean).length,
          streak_hari: profile.streak_count,
          rata_rata_minggu_ini: averages,
          rata_rata_minggu_lalu: previousAverages,
          skor_tiap_sesi: sessions.map((s) => ({
            tanggal: s.date.slice(0, 10),
            modul: s.moduleTitle,
            kategori: s.category,
            overall: s.overall,
            clarity: s.clarity,
            struktur: s.structure,
            confidence: s.confidence,
            intonasi: s.intonation,
            wpm: s.wpm,
            kata_pengisi: s.filler,
          })),
          kekuatan_terdeteksi: strengths,
          perbaikan_terdeteksi: improvements,
          catatan_pelatih_manual: scored
            .map((r) => r.coach_feedback)
            .filter(Boolean)
            .slice(0, 5),
          kategori_terlemah: focusCategories,
          drill_disarankan: recommendedDrills.map((d) => d.title),
        });
      } catch (error) {
        console.error(
          `[weeklySummary] narrative failed for user ${profile.id} week ${weekIndex}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const pdfBuffer = await renderWeeklySummaryPdf({
      userName: profile.full_name || "Pengguna",
      occupation: profile.occupation ?? null,
      weekIndex,
      periodStart,
      periodEnd,
      sessionCount: recorded.length,
      drillCount: drills.length,
      totalSeconds,
      activeDays,
      streakCount: profile.streak_count,
      quotaUsedSeconds,
      quotaTotalSeconds: WEEKLY_QUOTA_SECONDS,
      topupBalanceSeconds: profile.topup_seconds_balance ?? 0,
      averages,
      previousAverages,
      sessions,
      weeklyTrend,
      focusCategories,
      recommendedDrills,
      narrative,
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
      // Recorded, analysed sessions -- drills are reported separately in the
      // PDF and would otherwise inflate this number on the /summaries card.
      session_count: recorded.length,
    });

    // The summary itself is always generated and stays on /summaries; the
    // "Ringkasan & Laporan" setting only suppresses the nudge.
    if (profile.notif_digest !== false) {
      await notifyUser(supabase, profile.id, {
        type: "summary",
        title: "Ringkasan mingguan siap 📄",
        body: "Laporan latihan mingguan Anda sudah bisa diunduh.",
        url: "/summaries",
        icon: "/stickers/faisal-v2/celebrating.png",
      });
    }

    console.log(
      `[weeklySummary] generated week ${weekIndex} for user ${profile.id} in ${
        Date.now() - startedTs
      }ms (${recorded.length} sesi, ${drills.length} drill, narrative=${
        narrative ? "ok" : "fallback"
      })`,
    );
  }
}
