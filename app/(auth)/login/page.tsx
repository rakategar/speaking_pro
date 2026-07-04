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

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<"password" | "signup" | null>(null);
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
            ? "Email atau password salah. Belum punya akun? Pilih Daftar di bawah."
            : error.message,
      });
      setPending(null);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  // Instant email+password registration -- email confirmation is disabled
  // on this deployment (no SMTP), so the session starts immediately.
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setNotice(null);
    if (password.length < 6) {
      setNotice({ kind: "error", text: "Password minimal 6 karakter." });
      return;
    }
    setPending("signup");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || null } },
    });
    if (error) {
      setNotice({
        kind: "error",
        text: error.message.includes("already registered")
          ? "Email ini sudah terdaftar. Silakan pilih Masuk."
          : error.message,
      });
      setPending(null);
      return;
    }
    if (!data.session) {
      // Shouldn't happen with confirmations off, but degrade gracefully.
      setNotice({
        kind: "success",
        text: "Akun dibuat. Silakan masuk dengan email dan password Anda.",
      });
      setMode("signin");
      setPending(null);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  function switchMode(target: "signin" | "signup") {
    setMode(target);
    setNotice(null);
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

      <form
        onSubmit={mode === "signin" ? handleSignIn : handleSignUp}
        className="mt-8 space-y-5"
      >
        {mode === "signup" && (
          <div>
            <label
              htmlFor="fullName"
              className="block text-label-md font-label-md text-on-surface-variant mb-2"
            >
              Nama Lengkap
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                person
              </span>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama Anda"
                className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3.5 pl-12 pr-4 text-body-md text-on-surface placeholder:text-outline focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
              />
            </div>
          </div>
        )}

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
          <label
            htmlFor="password"
            className="block text-label-md font-label-md text-on-surface-variant mb-2"
          >
            Password
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              lock
            </span>
            <input
              id="password"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
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
          {pending ? (
            mode === "signin" ? (
              "Signing in..."
            ) : (
              "Membuat akun..."
            )
          ) : (
            <>
              {mode === "signin" ? "Sign In" : "Daftar"}
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

      {mode === "signin" ? (
        <button
          type="button"
          onClick={() => switchMode("signup")}
          disabled={pending !== null}
          className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-brand-cyan bg-surface-card py-3.5 text-body-md font-semibold text-on-surface hover:bg-secondary-fixed/40 active:scale-[0.99] transition disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[20px] text-brand-cyan">
            person_add
          </span>
          Daftar Akun Baru
        </button>
      ) : (
        <button
          type="button"
          onClick={() => switchMode("signin")}
          disabled={pending !== null}
          className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-brand-cyan bg-surface-card py-3.5 text-body-md font-semibold text-on-surface hover:bg-secondary-fixed/40 active:scale-[0.99] transition disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[20px] text-brand-cyan">
            login
          </span>
          Sudah punya akun? Masuk
        </button>
      )}

      <p className="mt-6 text-center text-label-sm font-label-sm text-text-secondary">
        {mode === "signin"
          ? "Belum punya akun? Daftar -- langsung aktif tanpa verifikasi email."
          : "Akun langsung aktif, tidak perlu verifikasi email."}
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
