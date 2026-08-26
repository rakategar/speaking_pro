"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClientLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/client/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Email atau password salah");
        return;
      }
      router.replace(json.mustChangePassword ? "/client/password" : "/client");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
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
          aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center justify-center text-outline hover:text-on-surface-variant"
        >
          <span className="material-symbols-outlined text-[20px]">
            {showPassword ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-full bg-primary-container py-3 font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
