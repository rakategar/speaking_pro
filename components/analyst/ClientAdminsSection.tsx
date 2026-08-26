"use client";

import { useCallback, useEffect, useState } from "react";

// The /analyst side of the B2B dashboard: issue, reset, suspend and delete the
// accounts a client logs in with, and print the credential letter that goes
// with them.
//
// The plaintext password exists only in this component's state, between the
// create/reset response and the moment the admin downloads the PDF or
// dismisses the panel. It is never stored server-side, so "lupa password"
// means reset, not recovery -- the UI says so.

type ClientOrg = { id: string; name: string; active: boolean };

type ClientAdmin = {
  id: string;
  client_org_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "viewer";
  active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
};

type Issued = {
  orgId: string;
  orgName: string;
  email: string;
  fullName: string | null;
  password: string;
  isReset: boolean;
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("id-ID") : "belum pernah";

export function ClientAdminsSection() {
  const [orgs, setOrgs] = useState<ClientOrg[]>([]);
  const [admins, setAdmins] = useState<ClientAdmin[]>([]);
  const [orgId, setOrgId] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"owner" | "viewer">("owner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issued, setIssued] = useState<Issued | null>(null);

  const load = useCallback(async () => {
    const [orgRes, adminRes] = await Promise.all([
      fetch("/api/analyst/clients", { cache: "no-store" }),
      fetch("/api/analyst/client-admins", { cache: "no-store" }),
    ]);
    if (orgRes.ok) {
      const json = await orgRes.json();
      setOrgs(json.items ?? []);
    }
    if (adminRes.ok) {
      const json = await adminRes.json();
      setAdmins(json.items ?? []);
    }
  }, []);

  useEffect(() => {
    // Inlined rather than calling load(), so the compiler does not see a
    // setState reachable from the effect body (react-hooks/set-state-in-effect).
    let active = true;
    Promise.all([
      fetch("/api/analyst/clients", { cache: "no-store" }),
      fetch("/api/analyst/client-admins", { cache: "no-store" }),
    ])
      .then(async ([orgRes, adminRes]) => {
        if (!active) return;
        if (orgRes.ok) {
          const json = await orgRes.json();
          if (active) setOrgs(json.items ?? []);
        }
        if (adminRes.ok) {
          const json = await adminRes.json();
          if (active) setAdmins(json.items ?? []);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/analyst/client-admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, email, fullName, role }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal membuat akun");
        return;
      }
      setIssued({
        orgId,
        orgName: json.orgName,
        email: json.admin.email,
        fullName: json.admin.full_name,
        password: json.password,
        isReset: false,
      });
      setEmail("");
      setFullName("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(admin: ClientAdmin) {
    if (
      !window.confirm(
        `Terbitkan password baru untuk ${admin.email}? Password lama langsung tidak berlaku.`,
      )
    ) {
      return;
    }
    setError("");
    const res = await fetch("/api/analyst/client-admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id, action: "reset-password" }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Gagal reset password");
      return;
    }
    setIssued({
      orgId: admin.client_org_id,
      orgName: json.orgName,
      email: admin.email,
      fullName: admin.full_name,
      password: json.password,
      isReset: true,
    });
    await load();
  }

  async function toggleActive(admin: ClientAdmin) {
    await fetch("/api/analyst/client-admins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id, active: !admin.active }),
    });
    await load();
  }

  async function remove(admin: ClientAdmin) {
    if (
      !window.confirm(
        `Hapus akun ${admin.email} secara permanen? Untuk mencabut akses sementara, gunakan Nonaktifkan.`,
      )
    ) {
      return;
    }
    await fetch("/api/analyst/client-admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id }),
    });
    await load();
  }

  async function downloadPdf(data: Issued) {
    const res = await fetch("/api/analyst/client-admins/credentials-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orgId: data.orgId,
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        isReset: data.isReset,
      }),
    });
    if (!res.ok) {
      setError("Gagal membuat PDF kredensial");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kredensial-${data.email.split("@")[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? "—";
  const inputClass =
    "rounded-2xl border border-outline-variant bg-surface-card px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30";

  return (
    <div className="space-y-6">
      {issued ? (
        <div className="rounded-2xl border-2 border-primary bg-surface-card p-5 shadow-soft">
          <p className="text-sm font-extrabold text-primary">
            {issued.isReset ? "Password baru diterbitkan" : "Akun dashboard dibuat"}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Password di bawah hanya ditampilkan sekali dan tidak disimpan di
            server. Unduh PDF panduannya sekarang — bila hilang, satu-satunya
            jalan adalah menerbitkan password baru.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs text-text-secondary">Client</p>
              <p className="text-sm font-semibold">{issued.orgName}</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Email</p>
              <p className="text-sm font-semibold">{issued.email}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-text-secondary">Password sementara</p>
              <p className="font-mono text-lg font-extrabold text-primary">
                {issued.password}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => downloadPdf(issued)}
              className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white"
            >
              Unduh PDF Panduan Login
            </button>
            <button
              onClick={() => setIssued(null)}
              className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-secondary"
            >
              Sudah disimpan, tutup
            </button>
          </div>
        </div>
      ) : null}

      <form
        onSubmit={create}
        className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft"
      >
        <p className="text-sm font-extrabold text-primary">Buat Akun Dashboard Client</p>
        <p className="mt-1 text-sm text-text-secondary">
          Akun ini hanya bisa membuka /client untuk organisasinya sendiri, dan
          tidak punya akses ke aplikasi peserta.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">Pilih client…</option>
            {orgs
              .filter((o) => o.active)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </select>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email PIC"
            className={inputClass}
            required
          />
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nama PIC (opsional)"
            className={inputClass}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "owner" | "viewer")}
            className={inputClass}
          >
            <option value="owner">Owner</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={busy || !orgId || !email}
          className="mt-4 rounded-full bg-primary-container px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Membuat..." : "Buat Akun & Terbitkan Kredensial"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-stroke-subtle bg-surface-card shadow-soft">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-stroke-subtle text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="p-3">Client</th>
              <th className="p-3">Akun</th>
              <th className="p-3">Role</th>
              <th className="p-3">Status</th>
              <th className="p-3">Login terakhir</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-b border-stroke-subtle/60">
                <td className="p-3 font-semibold">{orgName(a.client_org_id)}</td>
                <td className="p-3">
                  <p className="font-semibold">{a.email}</p>
                  <p className="text-xs text-text-secondary">
                    {a.full_name ?? "(tanpa nama)"}
                  </p>
                </td>
                <td className="p-3">{a.role}</td>
                <td className="p-3">
                  <span
                    className={
                      a.active
                        ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                        : "rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600"
                    }
                  >
                    {a.active ? "aktif" : "nonaktif"}
                  </span>
                  {a.must_change_password ? (
                    <span className="ml-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      belum ganti password
                    </span>
                  ) : null}
                </td>
                <td className="p-3 text-text-secondary">{fmtDate(a.last_login_at)}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => resetPassword(a)}
                      className="rounded-full border border-stroke-subtle px-3 py-1 text-xs font-semibold text-primary"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => toggleActive(a)}
                      className="rounded-full border border-stroke-subtle px-3 py-1 text-xs font-semibold text-text-secondary"
                    >
                      {a.active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => remove(a)}
                      className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {admins.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-text-secondary">
                  Belum ada akun dashboard client.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
