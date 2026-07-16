import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

const FALLBACK_DURATION_S = 90; // used until enough job history exists
const HISTORY_SAMPLE = 20;
const MIN_SANE_S = 5;
const MAX_SANE_S = 600;

/** Average wall-clock duration of recently completed analysis jobs. */
async function averageJobDurationSeconds(
  service: SupabaseClient<Database>,
): Promise<number> {
  const { data } = await service
    .from("analysis_jobs")
    .select("started_at, finished_at")
    .eq("status", "completed")
    .not("started_at", "is", null)
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(HISTORY_SAMPLE);

  const durations = (data ?? [])
    .map(
      (j) =>
        (new Date(j.finished_at!).getTime() -
          new Date(j.started_at!).getTime()) /
        1000,
    )
    .filter((s) => s >= MIN_SANE_S && s <= MAX_SANE_S);

  if (!durations.length) return FALLBACK_DURATION_S;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

/**
 * Estimated seconds until a job finishes -- replaces a raw queue-position
 * number with something users can actually plan around. The worker
 * processes one job at a time globally (lib/queue/worker.ts), so at most
 * one job ahead can be "processing"; everything else ahead is a full
 * average-duration wait.
 */
export async function estimateEtaSeconds(
  service: SupabaseClient<Database>,
  job: { status: string; created_at: string; started_at: string | null },
): Promise<number> {
  const avgS = await averageJobDurationSeconds(service);

  if (job.status === "processing") {
    const elapsed = job.started_at
      ? (Date.now() - new Date(job.started_at).getTime()) / 1000
      : 0;
    return Math.max(10, Math.round(avgS - elapsed));
  }

  const { data: ahead } = await service
    .from("analysis_jobs")
    .select("status, started_at")
    .in("status", ["queued", "processing"])
    .lt("created_at", job.created_at);

  let remaining = avgS; // this job's own processing time, once it starts
  for (const j of ahead ?? []) {
    if (j.status === "processing" && j.started_at) {
      const elapsed = (Date.now() - new Date(j.started_at).getTime()) / 1000;
      remaining += Math.max(5, avgS - elapsed);
    } else {
      remaining += avgS;
    }
  }
  return Math.max(15, Math.round(remaining));
}
