#!/usr/bin/env node
/**
 * Speaking Pro load test.
 *
 *   node loadtest.mjs prosody <N>   -- N concurrent requests straight at the
 *                                      intonation (prosody) microservice.
 *   node loadtest.mjs e2e <N>       -- N simulated users: signup -> upload
 *                                      recording -> trigger full AI analysis.
 *
 * Results also land in the /analyst dashboard (analysis_metrics table).
 */
import { readFileSync } from "node:fs";

const MODE = process.argv[2] ?? "prosody";
const N = Number(process.argv[3] ?? 15);
const VARIANT = process.argv[4] ?? "short"; // short | long

const BASE = "https://speakingpro.online";
const PROSODY_URL = "http://127.0.0.1:8100/analyze";

// "long" = the 5-minute maximum the app now enforces (recordings outside
// 15s..5min are rejected by /api/recordings).
const AUDIO_SET =
  VARIANT === "long"
    ? [{ file: "long5m.webm", duration: 300 }]
    : [{ file: "sample.webm", duration: 31 }];
const AUDIOS = AUDIO_SET.map((a) => ({
  ...a,
  data: readFileSync(new URL(`./${a.file}`, import.meta.url)),
}));
const pick = (i) => AUDIOS[(i - 1) % AUDIOS.length];

// Read secrets from the app's env file so they stay in one place.
const env = readFileSync("/opt/speaking_pro/.env.local", "utf8");
const grab = (k) => env.match(new RegExp(`^${k}=(.*)$`, "m"))?.[1]?.trim();
const ANON = grab("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const PROSODY_SECRET = grab("PROSODY_SERVICE_SECRET");

const now = () => performance.now();
const ms = (t) => Math.round(t);

function summarize(label, results) {
  const okTimes = results.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
  const failed = results.filter((r) => !r.ok);
  const pct = (p) =>
    okTimes.length ? ms(okTimes[Math.min(okTimes.length - 1, Math.ceil((p / 100) * okTimes.length) - 1)]) : "-";
  console.log(`\n===== HASIL: ${label} =====`);
  console.log(`sukses : ${okTimes.length}/${results.length}`);
  if (okTimes.length) {
    console.log(
      `latency: min ${ms(okTimes[0])}ms | p50 ${pct(50)}ms | p95 ${pct(95)}ms | max ${ms(okTimes[okTimes.length - 1])}ms | avg ${ms(okTimes.reduce((s, v) => s + v, 0) / okTimes.length)}ms`,
    );
  }
  if (failed.length) {
    const byErr = {};
    for (const f of failed) byErr[f.error] = (byErr[f.error] ?? 0) + 1;
    console.log("gagal  :");
    for (const [e, c] of Object.entries(byErr)) console.log(`  ${c}x ${e}`);
  }
}

// ---------------------------------------------------------------- prosody --
async function prosodyOne(i) {
  const t = now();
  const audio = pick(i);
  try {
    const form = new FormData();
    form.append("file", new Blob([audio.data], { type: "audio/webm" }), "rec.webm");
    const res = await fetch(PROSODY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${PROSODY_SECRET}` },
      body: form,
      signal: AbortSignal.timeout(600_000),
    });
    const dt = now() - t;
    if (!res.ok) return { i, ok: false, ms: dt, error: `HTTP ${res.status}` };
    await res.json();
    console.log(`  [prosody #${i}] selesai dalam ${ms(dt)}ms`);
    return { i, ok: true, ms: dt };
  } catch (e) {
    return { i, ok: false, ms: now() - t, error: String(e?.cause ?? e).slice(0, 80) };
  }
}

// -------------------------------------------------------------------- e2e --
// Build the @supabase/ssr session cookie the API routes expect.
function sessionCookie(session) {
  const name = `sb-${new URL(BASE).hostname.split(".")[0]}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const MAX = 3180;
  if (value.length <= MAX) return `${name}=${value}`;
  const parts = [];
  for (let i = 0; i * MAX < value.length; i++) {
    parts.push(`${name}.${i}=${value.slice(i * MAX, (i + 1) * MAX)}`);
  }
  return parts.join("; ");
}

async function e2eOne(i) {
  const email = `loadtest${i}@speaking.local`;
  const audio = pick(i);
  const t0 = now();
  const step = { signup: 0, upload: 0, analyze: 0 };
  try {
    // 1) signup (instant session -- confirmations off)
    let t = now();
    const su = await fetch(`${BASE}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: ANON, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "loadtest123",
        data: { full_name: `Load Tester ${i}` },
      }),
    });
    if (!su.ok) throw new Error(`signup HTTP ${su.status}: ${(await su.text()).slice(0, 120)}`);
    const session = await su.json();
    if (!session.access_token) throw new Error("signup tanpa session");
    step.signup = ms(now() - t);
    const cookie = sessionCookie(session);

    // 2) upload recording (multipart, same shape the recorder submits)
    t = now();
    const form = new FormData();
    form.append("audio", new Blob([audio.data], { type: "audio/webm" }), "recording.webm");
    form.append("environment", "ceo-stage");
    form.append("durationSeconds", String(audio.duration));
    form.append("moduleSlug", "free-recording");
    const up = await fetch(`${BASE}/api/recordings`, {
      method: "POST",
      headers: { cookie },
      body: form,
    });
    if (up.status !== 201) throw new Error(`upload HTTP ${up.status}: ${(await up.text()).slice(0, 120)}`);
    const { id } = await up.json();
    step.upload = ms(now() - t);
    console.log(
      `  [user #${i}] upload OK (${step.upload}ms, audio ${audio.duration}s), mulai analisis...`,
    );

    // 3) enqueue analysis (returns immediately), then poll like the real
    // UI does until the queue worker finishes the job.
    t = now();
    const an = await fetch(`${BASE}/api/recordings/${id}/analyze`, {
      method: "POST",
      headers: { cookie },
      signal: AbortSignal.timeout(60_000),
    });
    const anJson = await an.json().catch(() => ({}));
    if (!an.ok)
      throw new Error(`enqueue HTTP ${an.status}: ${JSON.stringify(anJson).slice(0, 140)}`);
    console.log(`  [user #${i}] masuk antrean #${anJson.position ?? "?"} , polling status...`);

    const POLL_LIMIT_MS = 45 * 60_000; // rate-limited queue can be slow by design
    let status = "";
    while (now() - t < POLL_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, 10_000));
      const st = await fetch(
        `${BASE}/rest/v1/recordings?id=eq.${id}&select=status`,
        { headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}` } },
      );
      status = (await st.json())?.[0]?.status ?? "";
      if (status === "analyzed" || status === "failed") break;
    }
    if (status !== "analyzed")
      throw new Error(
        status === "failed" ? "analisis gagal permanen" : "polling timeout 45 menit",
      );
    step.analyze = ms(now() - t);
    const total = ms(now() - t0);
    console.log(
      `  [user #${i}] ✓ SUKSES total ${total}ms (signup ${step.signup} / upload ${step.upload} / analyze ${step.analyze})`,
    );
    return { i, ok: true, ms: total, step };
  } catch (e) {
    const total = ms(now() - t0);
    const err = String(e.message ?? e).slice(0, 140);
    console.log(`  [user #${i}] ✗ GAGAL setelah ${total}ms: ${err}`);
    return { i, ok: false, ms: total, error: err, step };
  }
}

// ------------------------------------------------------------------- main --
console.log(
  `Mode: ${MODE} | Konkurensi: ${N} | Audio: ${AUDIOS.map((a) => `${a.file}(${a.duration}s)`).join(", ")}`,
);
const tAll = now();
const worker = MODE === "e2e" ? e2eOne : prosodyOne;
const results = await Promise.all(Array.from({ length: N }, (_, i) => worker(i + 1)));
console.log(`\nTotal wall time: ${ms(now() - tAll)}ms`);
summarize(MODE === "e2e" ? `E2E ${N} user bersamaan` : `Prosody ${N} request bersamaan`, results);

if (MODE === "e2e") {
  const okStep = results.filter((r) => r.ok);
  if (okStep.length) {
    const avg = (k) => ms(okStep.reduce((s, r) => s + r.step[k], 0) / okStep.length);
    console.log(`rata-rata per tahap (sukses): signup ${avg("signup")}ms | upload ${avg("upload")}ms | analyze ${avg("analyze")}ms`);
  }
  console.log("\n(Data per-run tercatat di dashboard /analyst — tabel analysis_metrics.)");
}
