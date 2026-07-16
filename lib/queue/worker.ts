// In-process analysis queue worker. Started once per server via
// instrumentation.ts. Picks jobs strictly one at a time (the 1-vCPU prosody
// service serializes anyway) so combined with lib/gemini/limiter.ts the
// Gemini free-tier quota can never be exceeded.
//
// Retry policy: transient failures are retried forever with capped backoff
// (the user must never be told an analysis failed); only deterministic
// input problems (too short / no speech) end a job as failed, silently.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { runAnalysis, isPermanentAnalysisError } from "@/lib/analysis/pipeline";
import { sendPushToUser } from "@/lib/push/send";
import { generateWeeklySummaries } from "@/lib/queue/weeklySummary";
import { generateMonthlyCertificates } from "@/lib/queue/monthlyCertificate";

const POLL_MS = 3_000;
const STALE_PROCESSING_MIN = 20; // reclaim jobs orphaned by a server restart
const BACKOFF_BASE_S = 30;
const BACKOFF_MAX_S = 300;
const REMINDER_HOUR_WIB = 19; // daily practice reminder, Asia/Jakarta

/**
 * Once a day after 19:00 WIB, nudge push-subscribed users who have not
 * practiced (no recording row of any status) that day. Piggybacks on the
 * worker loop — no extra service or cron.
 */
let lastReminderDate = "";
async function sendDailyReminders() {
  const now = new Date();
  const fmt = (opt: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", ...opt }).format(now);
  const today = fmt({}); // YYYY-MM-DD
  const hour = Number(fmt({ hour: "numeric", hourCycle: "h23" }));
  if (hour < REMINDER_HOUR_WIB || lastReminderDate === today) return;
  lastReminderDate = today;

  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id");
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (!userIds.length) return;

  const todayStart = new Date(`${today}T00:00:00+07:00`).toISOString();
  const { data: practiced } = await supabase
    .from("recordings")
    .select("user_id")
    .in("user_id", userIds)
    .gte("created_at", todayStart);
  const practicedSet = new Set((practiced ?? []).map((r) => r.user_id));

  let sent = 0;
  for (const userId of userIds) {
    if (practicedSet.has(userId)) continue;
    await sendPushToUser(userId, {
      title: "Waktunya latihan 💪",
      body: "Anda belum latihan hari ini. 10 menit drill menjaga streak Anda tetap hidup!",
      url: "/dashboard",
      icon: "/stickers/faisal/waving-mic.png",
    });
    sent += 1;
  }
  if (sent) console.log(`[worker] daily reminder sent to ${sent} user(s)`);
}

async function reclaimStale() {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MIN * 60_000).toISOString();
  const { data } = await supabase
    .from("analysis_jobs")
    .update({ status: "queued", next_attempt_at: new Date().toISOString() })
    .eq("status", "processing")
    .lt("started_at", cutoff)
    .select("id");
  if (data?.length) {
    console.warn(`[worker] reclaimed ${data.length} stale processing job(s)`);
  }
}

async function processOne(): Promise<boolean> {
  const supabase = createServiceRoleClient();
  const nowIso = new Date().toISOString();

  const { data: job } = await supabase
    .from("analysis_jobs")
    .select("id, recording_id, user_id, attempts")
    .eq("status", "queued")
    .lte("next_attempt_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!job) return false;

  // Claim it. The eq("status","queued") guard makes the claim atomic even
  // if a second worker loop ever existed.
  const { data: claimed } = await supabase
    .from("analysis_jobs")
    .update({
      status: "processing",
      attempts: job.attempts + 1,
      started_at: nowIso,
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (!claimed) return true; // someone else took it; look again

  console.log(
    `[worker] job ${job.id} start (recording ${job.recording_id}, attempt ${job.attempts + 1})`,
  );

  try {
    const { reportId } = await runAnalysis(job.recording_id);
    await supabase
      .from("analysis_jobs")
      .update({
        status: "done",
        finished_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", job.id);
    console.log(`[worker] job ${job.id} done (report ${reportId})`);
    const { data: report } = await supabase
      .from("reports")
      .select("overall_score")
      .eq("id", reportId)
      .maybeSingle();
    const score = report?.overall_score ?? 0;
    const scoreSticker =
      score >= 85 ? "celebrating" : score >= 65 ? "thumbs-up" : "tip-mic";
    await sendPushToUser(job.user_id, {
      title: "Analisis selesai 🎉",
      body: "Rapor latihan bicara Anda sudah siap. Ketuk untuk melihat hasilnya.",
      url: `/report/${job.recording_id}`,
      icon: `/stickers/faisal/${scoreSticker}.png`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 500) : String(error);
    if (isPermanentAnalysisError(error)) {
      // Unfixable input. End the job so the user can record again, but send
      // no notification -- the reason is shown in /history.
      await supabase
        .from("analysis_jobs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          last_error: message,
        })
        .eq("id", job.id);
      console.warn(`[worker] job ${job.id} permanently failed: ${message}`);
    } else {
      const attempt = job.attempts + 1;
      const backoffS = Math.min(BACKOFF_BASE_S * attempt, BACKOFF_MAX_S);
      await supabase
        .from("analysis_jobs")
        .update({
          status: "queued",
          next_attempt_at: new Date(Date.now() + backoffS * 1000).toISOString(),
          last_error: message,
        })
        .eq("id", job.id);
      console.warn(
        `[worker] job ${job.id} attempt ${attempt} failed, retry in ${backoffS}s: ${message}`,
      );
    }
  }
  return true;
}

export function startWorker() {
  const globalStore = globalThis as unknown as { __analysisWorker?: boolean };
  if (globalStore.__analysisWorker) return;
  globalStore.__analysisWorker = true;
  console.log("[worker] analysis queue worker started");

  (async () => {
    let lastReclaim = 0;
    for (;;) {
      try {
        if (Date.now() - lastReclaim > 5 * 60_000) {
          lastReclaim = Date.now();
          await reclaimStale();
          await sendDailyReminders();
          await generateWeeklySummaries();
          await generateMonthlyCertificates();
        }
        // Drain everything that is ready, then sleep.
        while (await processOne()) {
          /* keep going */
        }
      } catch (error) {
        console.error("[worker] loop error:", error);
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  })();
}
