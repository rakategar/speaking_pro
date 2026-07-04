"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type StageStat = {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number | null;
  p95: number | null;
} | null;

type Metrics = {
  generated_at: string;
  system: {
    cpus: number;
    cpu_model: string;
    loadavg: Record<string, number>;
    uptime_s: number;
    mem: { total_mb: number; free_mb: number; available_mb: number | null };
    swap: { total_mb: number | null; used_mb: number | null };
    disk_root: string;
  };
  services: { name: string; state: string }[];
  containers: string[];
  logs: { web: string; prosody: string; system_warnings: string };
  analysis: {
    total_runs: number;
    success: number;
    failed: number;
    stages: {
      prosody_ms: StageStat;
      asr_ms: StageStat;
      llm_ms: StageStat;
      total_ms: StageStat;
    };
    recent: {
      created_at: string;
      status: string;
      error: string | null;
      duration_seconds: number | null;
      audio_bytes: number | null;
      asr_ms: number | null;
      prosody_ms: number | null;
      llm_ms: number | null;
      total_ms: number | null;
      asr_model: string | null;
    }[];
  };
};

const fmtMs = (v: number | null | undefined) =>
  v == null ? "-" : v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`;

function StatCard({ title, stat }: { title: string; stat: StageStat }) {
  return (
    <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
      <p className="text-label-sm font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </p>
      {stat ? (
        <>
          <p className="mt-1 text-2xl font-extrabold text-primary">
            {fmtMs(stat.avg)}
            <span className="ml-1 text-xs font-normal text-text-secondary">avg</span>
          </p>
          <p className="mt-1 font-mono text-xs text-text-secondary">
            p50 {fmtMs(stat.p50)} · p95 {fmtMs(stat.p95)} · min {fmtMs(stat.min)} · max{" "}
            {fmtMs(stat.max)} · n={stat.count}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-text-secondary">belum ada data</p>
      )}
    </div>
  );
}

type FeedbackItem = {
  id: string;
  recording_id: string;
  overall_score: number | null;
  coach_feedback: string | null;
  created_at: string;
  duration_seconds: number | null;
  user_name: string;
};

// Coach panel: write a manual note that shows up as "Catatan Coach" on the
// user's report page.
function CoachFeedbackSection() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/analyst/feedback", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(id: string) {
    setSavingId(id);
    try {
      await fetch("/api/analyst/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: id, feedback: drafts[id] ?? "" }),
      });
      await load();
      setDrafts((d) => {
        const next = { ...d };
        delete next[id];
        return next;
      });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-primary">
        Coach Feedback{" "}
        <span className="text-sm font-normal text-text-secondary">
          (15 rapor terakhir — catatan tampil di halaman rapor user)
        </span>
      </h2>
      <div className="space-y-3">
        {items.map((it) => (
          <div
            key={it.id}
            className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-bold text-primary">{it.user_name}</span>
              <span className="text-text-secondary">
                {new Date(it.created_at).toLocaleString("id-ID")}
              </span>
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-mono text-xs">
                skor {it.overall_score ?? "-"}
              </span>
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-mono text-xs">
                {it.duration_seconds ? `${Math.round(it.duration_seconds)}s` : "-"}
              </span>
              {it.coach_feedback && !(it.id in drafts) && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  ✓ sudah diberi catatan
                </span>
              )}
            </div>
            <textarea
              value={drafts[it.id] ?? it.coach_feedback ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [it.id]: e.target.value }))
              }
              placeholder="Tulis catatan coach untuk user ini..."
              rows={2}
              className="mt-2 w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
            />
            <button
              onClick={() => save(it.id)}
              disabled={savingId === it.id || !(it.id in drafts)}
              className="mt-2 rounded-full bg-primary-container px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              {savingId === it.id ? "Menyimpan..." : "Simpan Catatan"}
            </button>
          </div>
        ))}
        {!items.length && (
          <p className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 text-sm text-text-secondary shadow-soft">
            Belum ada rapor analisis.
          </p>
        )}
      </div>
    </section>
  );
}

type SubscriptionItem = {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  subscription_renews_at: string | null;
  created_at: string;
};

// Subscription management: activate (premium, +30 days) or deactivate
// (back to free) any user's subscription manually.
function SubscriptionSection() {
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/analyst/subscriptions", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(user: SubscriptionItem) {
    const action =
      user.subscription_tier === "premium" ? "deactivate" : "activate";
    if (
      action === "deactivate" &&
      !window.confirm(`Nonaktifkan langganan ${user.email}?`)
    )
      return;
    setBusyId(user.id);
    setError("");
    try {
      const res = await fetch("/api/analyst/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q),
      )
    : items;
  const premiumCount = items.filter(
    (u) => u.subscription_tier === "premium",
  ).length;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-primary">
        Manajemen Langganan{" "}
        <span className="text-sm font-normal text-text-secondary">
          ({premiumCount} premium / {items.length} user)
        </span>
      </h2>
      <div className="rounded-2xl border border-stroke-subtle bg-surface-card shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-stroke-subtle p-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama / email..."
            className="w-full max-w-xs rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-stroke-subtle bg-surface-card text-xs text-text-secondary">
              <tr>
                {["user", "status", "berlaku s.d.", "daftar", "aksi"].map((h) => (
                  <th key={h} className="px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-stroke-subtle/50">
                  <td className="px-3 py-2">
                    <p className="font-semibold text-primary">
                      {u.full_name ?? "(tanpa nama)"}
                    </p>
                    <p className="font-mono text-xs text-text-secondary">
                      {u.email}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        u.subscription_tier === "premium"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"
                          : "rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-text-secondary"
                      }
                    >
                      {u.subscription_tier === "premium"
                        ? "Berlangganan"
                        : "Belum Berlangganan"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    {u.subscription_renews_at
                      ? new Date(u.subscription_renews_at).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" },
                        )
                      : "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-text-secondary">
                    {new Date(u.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggle(u)}
                      disabled={busyId === u.id}
                      className={
                        u.subscription_tier === "premium"
                          ? "rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                          : "rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                      }
                    >
                      {busyId === u.id
                        ? "..."
                        : u.subscription_tier === "premium"
                          ? "Nonaktifkan"
                          : "Aktifkan (30 hari)"}
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-text-secondary"
                  >
                    {items.length ? "Tidak ada yang cocok." : "Belum ada user."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function LogBox({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
      <p className="mb-2 text-label-sm font-semibold uppercase tracking-wider text-text-secondary">
        {title}
      </p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-black/85 p-3 font-mono text-[11px] leading-relaxed text-green-300">
        {text || "(kosong)"}
      </pre>
    </div>
  );
}

export default function AnalystPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<Metrics | null>(null);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = useCallback(async () => {
    const res = await fetch("/api/analyst/metrics", { cache: "no-store" });
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    if (res.ok) {
      setData(await res.json());
      setAuthed(true);
    }
  }, []);

  // Try once on mount -- cookie may already be set.
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (!authed || paused) return;
    timer.current = setInterval(fetchMetrics, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [authed, paused, fetchMetrics]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/analyst/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setError("Password salah");
      return;
    }
    await fetchMetrics();
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-3xl border border-stroke-subtle bg-surface-card p-8 shadow-soft"
        >
          <h1 className="text-xl font-extrabold text-primary">Analyst Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitoring beban sistem &amp; pipeline analisis suara.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="mt-6 w-full rounded-2xl border border-outline-variant bg-surface-card px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-primary-container py-3 font-semibold text-white hover:opacity-90"
          >
            Masuk
          </button>
        </form>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-secondary">
        Memuat metrik...
      </div>
    );
  }

  const { system, services, containers, logs, analysis } = data;
  const loadPct = Math.round((system.loadavg["1m"] / system.cpus) * 100);

  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-primary">Analyst Dashboard</h1>
            <p className="text-sm text-text-secondary">
              Update: {new Date(data.generated_at).toLocaleTimeString("id-ID")} · refresh 5s
            </p>
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-full border border-stroke-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-primary shadow-soft"
          >
            {paused ? "▶ Lanjutkan" : "⏸ Jeda"}
          </button>
        </header>

        {/* ---- system ---- */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
            <p className="text-label-sm font-semibold uppercase tracking-wider text-text-secondary">
              CPU Load (1m)
            </p>
            <p
              className={`mt-1 text-2xl font-extrabold ${loadPct > 90 ? "text-red-500" : loadPct > 60 ? "text-orange-500" : "text-primary"}`}
            >
              {system.loadavg["1m"].toFixed(2)}
              <span className="ml-1 text-xs font-normal text-text-secondary">
                / {system.cpus} core ({loadPct}%)
              </span>
            </p>
            <p className="mt-1 font-mono text-xs text-text-secondary">
              5m {system.loadavg["5m"].toFixed(2)} · 15m {system.loadavg["15m"].toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
            <p className="text-label-sm font-semibold uppercase tracking-wider text-text-secondary">
              RAM
            </p>
            <p className="mt-1 text-2xl font-extrabold text-primary">
              {system.mem.available_mb ?? system.mem.free_mb}
              <span className="ml-1 text-xs font-normal text-text-secondary">
                MB tersedia / {system.mem.total_mb} MB
              </span>
            </p>
            <p className="mt-1 font-mono text-xs text-text-secondary">
              swap {system.swap.used_mb ?? 0}/{system.swap.total_mb ?? 0} MB
            </p>
          </div>
          <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
            <p className="text-label-sm font-semibold uppercase tracking-wider text-text-secondary">
              Disk /
            </p>
            <pre className="mt-1 font-mono text-xs text-primary">{system.disk_root}</pre>
            <p className="mt-1 font-mono text-xs text-text-secondary">
              uptime {(system.uptime_s / 3600).toFixed(1)} jam
            </p>
          </div>
          <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
            <p className="text-label-sm font-semibold uppercase tracking-wider text-text-secondary">
              Services
            </p>
            <ul className="mt-1 space-y-0.5 font-mono text-xs">
              {services.map((s) => (
                <li key={s.name}>
                  <span
                    className={s.state === "active" ? "text-green-600" : "text-red-500"}
                  >
                    ●
                  </span>{" "}
                  {s.name}: {s.state}
                </li>
              ))}
              {containers.map((c) => (
                <li key={c} className="text-text-secondary">
                  🐳 {c}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- analysis pipeline ---- */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-primary">
            Durasi Pipeline Analisis Rekaman{" "}
            <span className="text-sm font-normal text-text-secondary">
              ({analysis.success} sukses / {analysis.failed} gagal, 100 run terakhir)
            </span>
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard title="Intonasi / Prosody (lokal)" stat={analysis.stages.prosody_ms} />
            <StatCard title="ASR Whisper (HF)" stat={analysis.stages.asr_ms} />
            <StatCard title="LLM Scoring (HF)" stat={analysis.stages.llm_ms} />
            <StatCard title="Total / rekaman" stat={analysis.stages.total_ms} />
          </div>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-stroke-subtle bg-surface-card shadow-soft">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-stroke-subtle text-text-secondary">
                <tr>
                  {["waktu", "status", "durasi audio", "prosody", "asr", "llm", "total", "error"].map(
                    (h) => (
                      <th key={h} className="px-3 py-2 font-semibold">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {analysis.recent.map((r, i) => (
                  <tr key={i} className="border-b border-stroke-subtle/50">
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleTimeString("id-ID")}
                    </td>
                    <td
                      className={`px-3 py-1.5 ${r.status === "success" ? "text-green-600" : "text-red-500"}`}
                    >
                      {r.status}
                    </td>
                    <td className="px-3 py-1.5">
                      {r.duration_seconds ? `${Math.round(r.duration_seconds)}s` : "-"}
                    </td>
                    <td className="px-3 py-1.5">{fmtMs(r.prosody_ms)}</td>
                    <td className="px-3 py-1.5">{fmtMs(r.asr_ms)}</td>
                    <td className="px-3 py-1.5">{fmtMs(r.llm_ms)}</td>
                    <td className="px-3 py-1.5 font-bold">{fmtMs(r.total_ms)}</td>
                    <td className="max-w-[220px] truncate px-3 py-1.5 text-red-400" title={r.error ?? ""}>
                      {r.error ?? ""}
                    </td>
                  </tr>
                ))}
                {!analysis.recent.length && (
                  <tr>
                    <td colSpan={8} className="px-3 py-4 text-center text-text-secondary">
                      Belum ada analisis tercatat. Jalankan rekaman atau load test.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---- subscription management ---- */}
        <SubscriptionSection />

        {/* ---- coach feedback ---- */}
        <CoachFeedbackSection />

        {/* ---- logs ---- */}
        <section className="grid gap-4 lg:grid-cols-2">
          <LogBox title="Log Service Web (Next.js)" text={logs.web} />
          <LogBox title="Log Service Prosody (Intonasi)" text={logs.prosody} />
        </section>
        <LogBox title="Log Sistem (warning+)" text={logs.system_warnings} />
      </div>
    </div>
  );
}
