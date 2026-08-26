"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { TicketGenerateSection } from "@/components/analyst/TicketGenerateSection";
import { TicketHistorySection } from "@/components/analyst/TicketHistorySection";
import { ClientAdminsSection } from "@/components/analyst/ClientAdminsSection";

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

type ProblemReport = {
  id: string;
  user_id: string;
  category: string;
  message: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
  user_name: string;
};

const REPORT_STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  open: { label: "Baru", className: "bg-amber-100 text-amber-700" },
  in_progress: { label: "Diproses", className: "bg-blue-100 text-blue-700" },
  resolved: { label: "Selesai", className: "bg-green-100 text-green-700" },
};

// Super-admin inbox: user-submitted problem reports (from /help "Laporan").
function ProblemReportsSection() {
  const [items, setItems] = useState<ProblemReport[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/analyst/reports", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await fetch("/api/analyst/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const openCount = items.filter((r) => r.status !== "resolved").length;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-primary">
        Laporan Masalah{" "}
        <span className="text-sm font-normal text-text-secondary">
          ({openCount} belum selesai dari {items.length} terbaru)
        </span>
      </h2>
      <div className="space-y-3">
        {items.map((r) => {
          const meta = REPORT_STATUS_META[r.status] ?? REPORT_STATUS_META.open;
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-bold text-primary">{r.user_name}</span>
                <span className="rounded-full bg-surface-container px-2 py-0.5 font-mono text-xs uppercase">
                  {r.category}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}
                >
                  {meta.label}
                </span>
                <span className="text-text-secondary">
                  {new Date(r.created_at).toLocaleString("id-ID")}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-on-surface">
                {r.message}
              </p>
              {r.screenshot_url && (
                <a
                  href={r.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.screenshot_url}
                    alt="Screenshot laporan"
                    className="max-h-40 rounded-xl border border-stroke-subtle"
                  />
                </a>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "in_progress" && (
                  <button
                    onClick={() => setStatus(r.id, "in_progress")}
                    disabled={busyId === r.id}
                    className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold text-primary hover:opacity-90 disabled:opacity-40"
                  >
                    Tandai Diproses
                  </button>
                )}
                {r.status !== "resolved" && (
                  <button
                    onClick={() => setStatus(r.id, "resolved")}
                    disabled={busyId === r.id}
                    className="rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
                  >
                    Tandai Selesai
                  </button>
                )}
                {r.status === "resolved" && (
                  <button
                    onClick={() => setStatus(r.id, "open")}
                    disabled={busyId === r.id}
                    className="rounded-full bg-surface-container px-3 py-1.5 text-xs font-semibold text-primary hover:opacity-90 disabled:opacity-40"
                  >
                    Buka Kembali
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!items.length && (
          <p className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 text-sm text-text-secondary shadow-soft">
            Belum ada laporan masuk.
          </p>
        )}
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

// ─────────────────────────────────────────────────────────────────────────
// User & subscription management
// ─────────────────────────────────────────────────────────────────────────

type UserItem = {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  subscription_renews_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  status: "premium" | "trial" | "expired" | "not_started";
  client_org_id: string | null;
  client_org_name: string | null;
  created_at: string;
};

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-on-surface"
            aria-label="Tutup"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        {subtitle && (
          <p className="mb-4 text-xs text-text-secondary">{subtitle}</p>
        )}
        {!subtitle && <div className="mb-4" />}
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-text-secondary">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30";

function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={6}
        className={`${inputCls} pr-10`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-outline hover:text-on-surface-variant"
      >
        <span className="material-symbols-outlined text-[18px]">
          {show ? "visibility_off" : "visibility"}
        </span>
      </button>
    </div>
  );
}

function AddUserModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/analyst/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Tambah User Baru" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nama Lengkap">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama Anda"
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={inputCls}
          />
        </Field>
        <Field label="Password">
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
          />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-primary-container py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Buat User"}
        </button>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserItem;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/analyst/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, full_name: fullName, email }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit User" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nama Lengkap">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-primary-container py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </form>
    </Modal>
  );
}

function SetPasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserItem;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/analyst/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, password }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Set Password — ${user.email}`}
      subtitle="Supabase menyimpan password dalam bentuk terenkripsi, jadi password lama user tidak bisa diintip. Yang bisa dilakukan adalah mengatur password baru untuk akun ini."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Password Baru">
          <PasswordField
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimal 6 karakter"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Konfirmasi Password">
          <PasswordField
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Ulangi password"
            autoComplete="new-password"
          />
        </Field>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-primary-container py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Set Password"}
        </button>
      </form>
    </Modal>
  );
}

type ClientOrg = {
  id: string;
  name: string;
  short_name: string | null;
  accent_color: string;
  active: boolean;
  member_count: number;
};

/** Shared loader for the client list -- used by the picker and the manager. */
function useClientOrgs() {
  const [orgs, setOrgs] = useState<ClientOrg[]>([]);
  const reload = useCallback(async () => {
    const res = await fetch("/api/analyst/clients", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setOrgs(json.items ?? []);
  }, []);
  // The initial fetch is inlined rather than calling reload(), so the state
  // update happens inside a promise callback the compiler can see is async --
  // calling reload() straight from the effect body trips
  // react-hooks/set-state-in-effect.
  useEffect(() => {
    let active = true;
    fetch("/api/analyst/clients", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (active && json) setOrgs(json.items ?? []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return { orgs, reload };
}

/** The org pill, reused in the user table and the ticket history. */
function ClientPill({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={{
        color,
        borderColor: `${color}59`,
        backgroundColor: `${color}1a`,
      }}
    >
      {name}
    </span>
  );
}

// Assigns (or clears) the client badge. Handles one user and a bulk selection
// with the same form -- the only difference is which body shape it POSTs.
function SetClientModal({
  users,
  orgs,
  onClose,
  onSaved,
}: {
  users: UserItem[];
  orgs: ClientOrg[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [orgId, setOrgId] = useState(
    users.length === 1 ? (users[0].client_org_id ?? "") : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/analyst/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          users.length === 1
            ? { userId: users[0].id, client_org_id: orgId || null }
            : { userIds: users.map((u) => u.id), client_org_id: orgId || null },
        ),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Badge Client"
      subtitle={
        users.length === 1
          ? users[0].email
          : `${users.length} user terpilih akan diberi badge yang sama.`
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Client">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className={inputCls}
          >
            <option value="">— Tanpa badge (user publik) —</option>
            {orgs
              .filter((o) => o.active || o.id === orgId)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.active ? "" : " (nonaktif)"}
                </option>
              ))}
          </select>
        </Field>
        {orgs.length === 0 && (
          <p className="text-xs text-text-secondary">
            Belum ada client. Buat dulu di panel &quot;Client B2B&quot; di atas
            tabel.
          </p>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-primary-container py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan Badge"}
        </button>
      </form>
    </Modal>
  );
}

// Create/rename/recolor/delete the B2B clients themselves. Renaming here
// changes the badge everywhere at once, which is the whole reason clients are
// a table rather than a free-text column on each profile.
function ClientOrganizationsSection({
  orgs,
  reload,
  onChanged,
}: {
  orgs: ClientOrg[];
  reload: () => Promise<void>;
  /** Refreshes the user table, whose badge column reads these names. */
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState("#00629d");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/analyst/clients", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return false;
      }
      await reload();
      await onChanged();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const ok = await send("POST", {
      name,
      short_name: shortName,
      accent_color: color,
    });
    if (ok) {
      setName("");
      setShortName("");
      setColor("#00629d");
    }
  }

  async function rename(org: ClientOrg) {
    const next = window.prompt("Nama client:", org.name);
    if (next === null || !next.trim() || next === org.name) return;
    await send("PATCH", { id: org.id, name: next });
  }

  async function remove(org: ClientOrg) {
    if (
      !window.confirm(
        `Hapus client "${org.name}"?\n\n${org.member_count} user akan kehilangan badge ini, tapi akun mereka tidak dihapus.`,
      )
    )
      return;
    await send("DELETE", { id: org.id });
  }

  return (
    <div className="mb-4 rounded-2xl border border-stroke-subtle bg-surface-card shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-primary">
          <span className="material-symbols-outlined text-[18px]">
            apartment
          </span>
          Client B2B
          <span className="text-xs font-normal text-text-secondary">
            ({orgs.length} client)
          </span>
        </span>
        <span className="material-symbols-outlined text-[20px] text-text-secondary">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open && (
        <div className="border-t border-stroke-subtle p-4">
          <form
            onSubmit={create}
            className="mb-4 flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[12rem] flex-1">
              <Field label="Nama Client">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kementerian Kehutanan"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="w-32">
              <Field label="Singkatan">
                <input
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value)}
                  placeholder="KLHK"
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="w-24">
              <Field label="Warna">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-[38px] w-full rounded-xl border border-outline-variant bg-surface px-1"
                />
              </Field>
            </div>
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Tambah Client
            </button>
          </form>

          {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

          {orgs.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Belum ada client. Tambahkan satu untuk mulai menandai peserta
              program B2B.
            </p>
          ) : (
            <ul className="space-y-2">
              {orgs.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stroke-subtle px-3 py-2"
                >
                  <span className="flex items-center gap-2">
                    <ClientPill name={o.name} color={o.accent_color} />
                    <span className="text-xs text-text-secondary">
                      {o.member_count} user
                      {o.active ? "" : " • nonaktif"}
                    </span>
                  </span>
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => rename(o)}
                      disabled={busy}
                      className="rounded-full border border-stroke-subtle px-3 py-1 text-xs font-semibold text-primary hover:bg-surface-container disabled:opacity-40"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => send("PATCH", { id: o.id, active: !o.active })}
                      disabled={busy}
                      className="rounded-full border border-stroke-subtle px-3 py-1 text-xs font-semibold text-primary hover:bg-surface-container disabled:opacity-40"
                    >
                      {o.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(o)}
                      disabled={busy}
                      className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Hapus
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type ModalState =
  | { kind: "add" }
  | { kind: "edit"; user: UserItem }
  | { kind: "password"; user: UserItem }
  | { kind: "client"; users: UserItem[] }
  | null;

// Combined user management: CRUD (add/edit/delete + password reset) merged
// with the existing subscription activate/deactivate toggle.
function UserManagementSection() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const { orgs, reload: reloadOrgs } = useClientOrgs();

  const load = useCallback(async () => {
    const res = await fetch("/api/analyst/users", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    const next: UserItem[] = json.items ?? [];
    setItems(next);
    // Drop ids that no longer exist (deleted here or elsewhere) so the
    // selection count can never claim more than the table shows.
    setSelected((prev) => {
      const live = new Set(next.map((u) => u.id));
      const kept = new Set([...prev].filter((id) => live.has(id)));
      return kept.size === prev.size ? prev : kept;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleSubscription(user: UserItem) {
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

  async function trialAction(user: UserItem, action: "reset_trial" | "extend_trial") {
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

  async function removeUser(user: UserItem) {
    if (
      !window.confirm(
        `Hapus akun ${user.email}? Tindakan ini tidak bisa dibatalkan.`,
      )
    )
      return;
    setBusyId(user.id);
    setError("");
    try {
      const res = await fetch("/api/analyst/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
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

  // Bulk actions. Each one reloads afterwards, so the table and the selection
  // can never drift out of step with the server.
  async function bulkSubscription(
    action: "activate" | "deactivate" | "reset_trial" | "extend_trial",
    confirmMessage?: string,
  ) {
    const userIds = [...selected];
    if (!userIds.length) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setBulkBusy(true);
    setError("");
    try {
      const res = await fetch("/api/analyst/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds, action }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDelete() {
    const userIds = [...selected];
    if (!userIds.length) return;
    // A typed count rather than a plain confirm: this deletes accounts and
    // everything hanging off them, and a stray Enter should not be enough.
    const answer = window.prompt(
      `Hapus ${userIds.length} akun secara permanen?\n\nKetik angka ${userIds.length} untuk konfirmasi.`,
    );
    if (answer?.trim() !== String(userIds.length)) return;
    setBulkBusy(true);
    setError("");
    try {
      const res = await fetch("/api/analyst/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      if (json.failed?.length) {
        setError(`${json.deleted} terhapus, ${json.failed.length} gagal.`);
      }
      await load();
    } finally {
      setBulkBusy(false);
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
  const orgColors = new Map(orgs.map((o) => [o.id, o.accent_color]));
  // "Select all" applies to what is on screen, not the whole table: ticking a
  // box while a search is active must never quietly select filtered-out users.
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((u) => selected.has(u.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) for (const u of filtered) next.delete(u.id);
      else for (const u of filtered) next.add(u.id);
      return next;
    });
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-primary">
          Manajemen User &amp; Langganan{" "}
          <span className="text-sm font-normal text-text-secondary">
            ({premiumCount} premium / {items.length} user)
          </span>
        </h2>
        <button
          type="button"
          onClick={() => setModal({ kind: "add" })}
          className="flex items-center gap-1.5 rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <span className="material-symbols-outlined text-[18px]">
            person_add
          </span>
          Tambah User
        </button>
      </div>
      <ClientOrganizationsSection
        orgs={orgs}
        reload={reloadOrgs}
        onChanged={load}
      />

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

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-stroke-subtle bg-secondary-container/10 p-3">
            <span className="mr-1 text-sm font-semibold text-primary">
              {selected.size} user dipilih
            </span>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() =>
                setModal({
                  kind: "client",
                  users: items.filter((u) => selected.has(u.id)),
                })
              }
              className="rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40"
            >
              Set Client
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkSubscription("activate")}
              className="rounded-full border border-green-300 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-40"
            >
              Aktifkan (30 hari)
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() =>
                bulkSubscription(
                  "deactivate",
                  `Nonaktifkan langganan ${selected.size} user?`,
                )
              }
              className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
            >
              Nonaktifkan
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkSubscription("extend_trial")}
              className="rounded-full border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
            >
              +7 Hari Trial
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkSubscription("reset_trial")}
              className="rounded-full border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
            >
              Reset Trial
            </button>
            <button
              type="button"
              disabled={bulkBusy}
              onClick={bulkDelete}
              className="rounded-full border border-red-400 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto text-xs font-semibold text-text-secondary hover:text-on-surface"
            >
              Batal pilih
            </button>
          </div>
        )}
        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-stroke-subtle bg-surface-card text-xs text-text-secondary">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    disabled={filtered.length === 0}
                    aria-label="Pilih semua user yang tampil"
                    className="h-4 w-4 cursor-pointer accent-[#00629d]"
                  />
                </th>
                {["user", "client", "status", "berlaku s.d.", "daftar", "aksi"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className={
                    selected.has(u.id)
                      ? "border-b border-stroke-subtle/50 bg-secondary-container/10"
                      : "border-b border-stroke-subtle/50"
                  }
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      onChange={() => toggleOne(u.id)}
                      aria-label={`Pilih ${u.email}`}
                      className="h-4 w-4 cursor-pointer accent-[#00629d]"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-primary">
                      {u.full_name ?? "(tanpa nama)"}
                    </p>
                    <p className="font-mono text-xs text-text-secondary">
                      {u.email}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {u.client_org_name ? (
                      <ClientPill
                        name={u.client_org_name}
                        color={
                          (u.client_org_id && orgColors.get(u.client_org_id)) ||
                          "#00629d"
                        }
                      />
                    ) : (
                      <span className="text-xs text-text-secondary">Publik</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        u.status === "premium"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"
                          : u.status === "trial"
                            ? "rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700"
                            : u.status === "expired"
                              ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
                              : "rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-text-secondary"
                      }
                    >
                      {u.status === "premium"
                        ? "Premium"
                        : u.status === "trial"
                          ? "Trial"
                          : u.status === "expired"
                            ? "Kedaluwarsa"
                            : "Belum Mulai"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    {u.status === "premium"
                      ? u.subscription_renews_at
                        ? new Date(u.subscription_renews_at).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" },
                          )
                        : "-"
                      : u.trial_ends_at
                        ? new Date(u.trial_ends_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
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
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => toggleSubscription(u)}
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
                      {u.status !== "premium" && (
                        <button
                          onClick={() =>
                            trialAction(
                              u,
                              u.status === "trial" ? "extend_trial" : "reset_trial",
                            )
                          }
                          disabled={busyId === u.id}
                          className="rounded-full border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                        >
                          {u.status === "expired"
                            ? "Reset Trial"
                            : u.status === "trial"
                              ? "+7 Hari Trial"
                              : "Mulai Trial"}
                        </button>
                      )}
                      <button
                        onClick={() => setModal({ kind: "client", users: [u] })}
                        className="rounded-full border border-stroke-subtle px-3 py-1 text-xs font-semibold text-primary hover:bg-surface-container"
                      >
                        Client
                      </button>
                      <button
                        onClick={() => setModal({ kind: "edit", user: u })}
                        className="rounded-full border border-stroke-subtle px-3 py-1 text-xs font-semibold text-primary hover:bg-surface-container"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setModal({ kind: "password", user: u })}
                        className="rounded-full border border-stroke-subtle px-3 py-1 text-xs font-semibold text-primary hover:bg-surface-container"
                      >
                        Set Password
                      </button>
                      <button
                        onClick={() => removeUser(u)}
                        disabled={busyId === u.id}
                        className="rounded-full border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={7}
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

      {modal?.kind === "add" && (
        <AddUserModal onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal?.kind === "edit" && (
        <EditUserModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
      {modal?.kind === "password" && (
        <SetPasswordModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
      {modal?.kind === "client" && (
        <SetClientModal
          users={modal.users}
          orgs={orgs}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await load();
            await reloadOrgs();
          }}
        />
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

type Tab =
  | "monitoring"
  | "users"
  | "client-b2b"
  | "laporan"
  | "tiket"
  | "riwayat-tiket";

const TABS: { id: Tab; label: string }[] = [
  { id: "monitoring", label: "Monitoring" },
  { id: "users", label: "Manajemen User" },
  { id: "client-b2b", label: "Client B2B" },
  { id: "laporan", label: "Laporan Masalah" },
  { id: "tiket", label: "Generate Ticket" },
  { id: "riwayat-tiket", label: "Riwayat Ticket" },
];

export default function AnalystPage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Metrics | null>(null);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState<Tab>("monitoring");
  // Bumped after a generate so the history tab refetches instead of showing
  // a stale list when the admin switches over to check the new batch.
  const [ticketReload, setTicketReload] = useState(0);
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
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Username atau password salah");
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
          <div className="flex justify-center mb-4">
            <Logo className="h-8 w-auto" />
          </div>
          <h1 className="text-xl font-extrabold text-primary">Analyst Dashboard</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitoring beban sistem &amp; pipeline analisis suara.
          </p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="username"
            autoFocus
            className="mt-6 w-full rounded-2xl border border-outline-variant bg-surface-card px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
          />
          <div className="relative mt-3">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-outline-variant bg-surface-card px-4 py-3 pr-12 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-outline hover:text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
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
        <div className="flex items-center justify-center py-1.5 border-b border-stroke-subtle/30">
          <Logo className="h-5 w-auto" />
        </div>
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

        {/* ---- tabs ---- */}
        <div className="flex gap-2 border-b border-stroke-subtle">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "border-b-2 border-primary px-4 py-2 text-sm font-semibold text-primary"
                  : "border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-text-secondary hover:text-primary"
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "monitoring" ? (
          <div className="space-y-6">
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

            {/* ---- coach feedback ---- */}
            <CoachFeedbackSection />

            {/* ---- logs ---- */}
            <section className="grid gap-4 lg:grid-cols-2">
              <LogBox title="Log Service Web (Next.js)" text={logs.web} />
              <LogBox title="Log Service Prosody (Intonasi)" text={logs.prosody} />
            </section>
            <LogBox title="Log Sistem (warning+)" text={logs.system_warnings} />
          </div>
        ) : tab === "users" ? (
          <UserManagementSection />
        ) : tab === "client-b2b" ? (
          <ClientAdminsSection />
        ) : tab === "tiket" ? (
          <TicketGenerateSection
            onGenerated={() => setTicketReload((n) => n + 1)}
          />
        ) : tab === "riwayat-tiket" ? (
          <TicketHistorySection reloadKey={ticketReload} />
        ) : (
          <ProblemReportsSection />
        )}
      </div>
    </div>
  );
}
