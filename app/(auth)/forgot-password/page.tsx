"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("error") === "expired";

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || sent) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal mengirim link reset.");
        return;
      }
      setSent(true);
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-surface-card rounded-3xl shadow-soft border border-stroke-subtle px-6 py-10 sm:px-8">
      <div className="flex flex-col items-center text-center">
        <Logo className="size-20" />
        <h1 className="mt-4 text-title-lg font-title-lg text-on-surface">
          Lupa Password
        </h1>
        <p className="mt-1 text-body-md text-text-secondary">
          Masukkan email Anda, kami kirim link untuk mengatur password baru.
        </p>
      </div>

      {expired && !sent && (
        <p
          role="alert"
          className="mt-6 rounded-2xl bg-error-container px-4 py-3 text-label-md font-label-md text-on-error-container"
        >
          Link sudah tidak berlaku atau pernah dipakai. Minta link baru di
          bawah.
        </p>
      )}

      {sent ? (
        <div className="mt-8 flex flex-col gap-4">
          <p
            role="status"
            className="rounded-2xl bg-secondary-fixed px-4 py-3 text-label-md font-label-md text-on-secondary-fixed"
          >
            Jika email tersebut terdaftar, kami sudah mengirim link reset
            password. Cek inbox dan folder spam Anda. Link berlaku 1 jam.
          </p>
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-brand-cyan bg-surface-card py-3.5 text-body-md font-semibold text-on-surface hover:bg-secondary-fixed/40 active:scale-[0.99] transition"
          >
            <span className="material-symbols-outlined text-[20px] text-brand-cyan">
              login
            </span>
            Kembali ke Masuk
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-label-md font-label-md text-on-surface-variant mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                mail
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3.5 pl-12 pr-4 text-body-md text-on-surface placeholder:text-outline focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className={cn(
                "rounded-2xl px-4 py-3 text-label-md font-label-md",
                "bg-error-container text-on-error-container",
              )}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-primary-container py-4 text-body-md font-semibold text-white shadow-soft hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
          >
            {pending ? (
              "Mengirim..."
            ) : (
              <>
                Kirim Link Reset
                <span className="material-symbols-outlined text-[20px]">
                  send
                </span>
              </>
            )}
          </button>

          <Link
            href="/login"
            className="block text-center text-label-md font-label-md text-text-secondary hover:text-on-surface transition"
          >
            &larr; Kembali ke Masuk
          </Link>
        </form>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
