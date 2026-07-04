import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isAuthorized } from "@/lib/analyst/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const exec = promisify(execFile);

async function run(cmd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await exec(cmd, args, { timeout: 8000 });
    return stdout.trim();
  } catch (e) {
    return `(gagal: ${e instanceof Error ? e.message.slice(0, 120) : e})`;
  }
}

function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function stageStats(values: (number | null)[]) {
  const nums = values.filter((v): v is number => typeof v === "number").sort((a, b) => a - b);
  if (!nums.length) return null;
  return {
    count: nums.length,
    min: nums[0],
    max: nums[nums.length - 1],
    avg: Math.round(nums.reduce((s, v) => s + v, 0) / nums.length),
    p50: percentile(nums, 50),
    p95: percentile(nums, 95),
  };
}

// GET /api/analyst/metrics -- everything the dashboard renders, one call.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---- system ----
  const [load1, load5, load15] = os.loadavg();
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const meminfo = await run("cat", ["/proc/meminfo"]);
  const availMatch = meminfo.match(/MemAvailable:\s+(\d+) kB/);
  const swapTotalMatch = meminfo.match(/SwapTotal:\s+(\d+) kB/);
  const swapFreeMatch = meminfo.match(/SwapFree:\s+(\d+) kB/);
  const disk = await run("df", ["-h", "--output=used,size,pcent", "/"]);

  // ---- services ----
  const services = await Promise.all(
    ["speaking-pro-web", "speaking-pro-prosody", "nginx"].map(async (name) => ({
      name,
      state: await run("systemctl", ["is-active", name]),
    })),
  );
  const containers = await run("docker", [
    "ps",
    "--filter", "name=speaking",
    "--format", "{{.Names}}|{{.Status}}",
  ]);

  // ---- logs (recent) ----
  const [webLog, prosodyLog, sysLog] = await Promise.all([
    run("journalctl", ["-u", "speaking-pro-web", "-n", "40", "--no-pager", "-o", "short-iso"]),
    run("journalctl", ["-u", "speaking-pro-prosody", "-n", "40", "--no-pager", "-o", "short-iso"]),
    run("journalctl", ["-p", "warning", "-n", "25", "--no-pager", "-o", "short-iso"]),
  ]);

  // ---- analysis pipeline metrics ----
  const supabase = createServiceRoleClient();
  const { data: rows } = await supabase
    .from("analysis_metrics")
    .select(
      "created_at, status, error, duration_seconds, audio_bytes, asr_ms, prosody_ms, llm_ms, total_ms, asr_model",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const all = rows ?? [];
  const ok = all.filter((r) => r.status === "success");
  const analysis = {
    total_runs: all.length,
    success: ok.length,
    failed: all.length - ok.length,
    // Per-stage stats use every run that reached the stage (a run can fail
    // at the LLM step while its prosody/ASR timings are still valid).
    stages: {
      prosody_ms: stageStats(all.map((r) => r.prosody_ms)),
      asr_ms: stageStats(all.map((r) => r.asr_ms)),
      llm_ms: stageStats(all.map((r) => r.llm_ms)),
      total_ms: stageStats(ok.map((r) => r.total_ms)),
    },
    recent: all.slice(0, 20),
  };

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    system: {
      cpus: os.cpus().length,
      cpu_model: os.cpus()[0]?.model ?? "?",
      loadavg: { "1m": load1, "5m": load5, "15m": load15 },
      uptime_s: Math.round(os.uptime()),
      mem: {
        total_mb: Math.round(memTotal / 1048576),
        free_mb: Math.round(memFree / 1048576),
        available_mb: availMatch ? Math.round(Number(availMatch[1]) / 1024) : null,
      },
      swap: {
        total_mb: swapTotalMatch ? Math.round(Number(swapTotalMatch[1]) / 1024) : null,
        used_mb:
          swapTotalMatch && swapFreeMatch
            ? Math.round((Number(swapTotalMatch[1]) - Number(swapFreeMatch[1])) / 1024)
            : null,
      },
      disk_root: disk,
    },
    services,
    containers: containers.split("\n").filter(Boolean),
    logs: { web: webLog, prosody: prosodyLog, system_warnings: sysLog },
    analysis,
  });
}
