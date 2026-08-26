"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MIN_LENGTH = 10;

export function ChangePasswordForm({ mustChange }: { mustChange: boolean }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/client/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal mengubah password");
        return;
      }
      router.replace("/client");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-3 w-full rounded-2xl border border-outline-variant bg-surface-card px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30";

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder={mustChange ? "Password sementara" : "Password lama"}
        autoComplete="current-password"
        autoFocus
        className={inputClass}
      />
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder={`Password baru (min ${MIN_LENGTH} karakter)`}
        autoComplete="new-password"
        className={inputClass}
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Ulangi password baru"
        autoComplete="new-password"
        className={inputClass}
      />
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy || newPassword.length < MIN_LENGTH}
        className="mt-4 w-full rounded-full bg-primary-container py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Menyimpan..." : "Simpan Password"}
      </button>
    </form>
  );
}
