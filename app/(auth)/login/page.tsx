"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

type Notice = { kind: "error" | "success"; text: string } | null;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"password" | "magic" | "reset" | null>(
    null,
  );
  const [notice, setNotice] = useState<Notice>(null);

  const supabase = createClient();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setNotice(null);
    setPending("password");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setNotice({
        kind: "error",
        text:
          error.message === "Invalid login credentials"
            ? "Email atau password salah. Coba lagi, atau masuk lewat Magic Link."
            : error.message,
      });
      setPending(null);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function handleMagicLink() {
    if (pending) return;
    setNotice(null);
    if (!email) {
      setNotice({
        kind: "error",
        text: "Isi alamat email dulu, lalu tekan Send Magic Link.",
      });
      return;
    }
    setPending("magic");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setPending(null);
    if (error) {
      setNotice({ kind: "error", text: error.message });
      return;
    }
    setNotice({
      kind: "success",
      text: `Magic link terkirim ke ${email}. Cek inbox Anda -- akun baru dibuat otomatis.`,
    });
  }

  async function handleForgotPassword() {
    if (pending) return;
    setNotice(null);
    if (!email) {
      setNotice({
        kind: "error",
        text: "Isi alamat email dulu, lalu tekan Forgot Password.",
      });
      return;
    }
    setPending("reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
    });
    setPending(null);
    if (error) {
      setNotice({ kind: "error", text: error.message });
      return;
    }
    setNotice({
      kind: "success",
      text: `Link reset password terkirim ke ${email}.`,
    });
  }

  return (
    <div className="bg-surface-card rounded-3xl shadow-soft border border-stroke-subtle px-6 py-10 sm:px-8">
      <div className="flex flex-col items-center text-center">
        <Logo className="size-20" />
        <h1 className="mt-4 text-title-lg font-title-lg text-on-surface">
          Speaking Pro™
        </h1>
        <p className="mt-1 text-body-md text-text-secondary">
          Elevate your communication skills.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="mt-8 space-y-5">
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

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-label-md font-label-md text-on-surface-variant"
            >
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-label-md font-label-md text-brand-cyan hover:underline disabled:opacity-50"
              disabled={pending !== null}
            >
              {pending === "reset" ? "Mengirim..." : "Forgot Password?"}
            </button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              lock
            </span>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3.5 pl-12 pr-4 text-body-md text-on-surface placeholder:text-outline focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
            />
          </div>
        </div>

        {notice && (
          <p
            role={notice.kind === "error" ? "alert" : "status"}
            className={cn(
              "rounded-2xl px-4 py-3 text-label-md font-label-md",
              notice.kind === "error"
                ? "bg-error-container text-on-error-container"
                : "bg-secondary-fixed text-on-secondary-fixed",
            )}
          >
            {notice.text}
          </p>
        )}

        <button
          type="submit"
          disabled={pending !== null}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-primary-container py-4 text-body-md font-semibold text-white shadow-soft hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
        >
          {pending === "password" ? (
            "Signing in..."
          ) : (
            <>
              Sign In
              <span className="material-symbols-outlined text-[20px]">
                arrow_forward
              </span>
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-stroke-subtle" />
        <span className="text-label-sm font-label-sm tracking-widest text-outline">
          OR
        </span>
        <span className="h-px flex-1 bg-stroke-subtle" />
      </div>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={pending !== null}
        className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-brand-cyan bg-surface-card py-3.5 text-body-md font-semibold text-on-surface hover:bg-secondary-fixed/40 active:scale-[0.99] transition disabled:opacity-60"
      >
        {pending === "magic" ? (
          "Mengirim link..."
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px] text-brand-cyan">
              magic_button
            </span>
            Send Magic Link
          </>
        )}
      </button>

      <p className="mt-6 text-center text-label-sm font-label-sm text-text-secondary">
        Belum punya akun? Kirim Magic Link -- akun dibuat otomatis.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
