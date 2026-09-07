"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";

// Password reset, step 3. Reached only via /auth/confirm, which has already
// exchanged the emailed token for a session -- so "signed in" is the proof
// that the link was genuine, and there is no token to re-check here.
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setAuthorized(Boolean(data.user));
      setChecking(false);
    });
    return () => {
      active = false;
    };
    // supabase is recreated per render; the check only needs to run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    // Matches minimum_password_length in supabase/config.toml; GoTrue would
    // reject a shorter one anyway, but not in Indonesian.
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak sama.");
      return;
    }
    setPending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }
    // The password is already changed at this point. Revoking the other
    // sessions is what locks out anyone who got in with the old one, but if
    // it fails there is nothing to roll back and nothing useful to say -- do
    // not turn a successful reset into an error screen.
    try {
      await supabase.auth.signOut({ scope: "others" });
    } catch (signOutError) {
      console.error("[reset-password] revoking other sessions failed:", signOutError);
    }
    router.replace("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="bg-surface-card rounded-3xl shadow-soft border border-stroke-subtle px-6 py-10 sm:px-8 text-center">
        <p className="text-body-md text-text-secondary">Memuat...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="bg-surface-card rounded-3xl shadow-soft border border-stroke-subtle px-6 py-10 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <Logo className="size-20" />
          <h1 className="mt-4 text-title-lg font-title-lg text-on-surface">
            Link Tidak Berlaku
          </h1>
          <p className="mt-2 text-body-md text-text-secondary">
            Sesi reset password Anda sudah berakhir atau link-nya pernah
            dipakai. Silakan minta link baru.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="mt-8 w-full flex items-center justify-center gap-2 rounded-full bg-primary-container py-4 text-body-md font-semibold text-white shadow-soft hover:opacity-90 active:scale-[0.99] transition"
        >
          Minta Link Baru
          <span className="material-symbols-outlined text-[20px]">
            arrow_forward
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-3xl shadow-soft border border-stroke-subtle px-6 py-10 sm:px-8">
      <div className="flex flex-col items-center text-center">
        <Logo className="size-20" />
        <h1 className="mt-4 text-title-lg font-title-lg text-on-surface">
          Password Baru
        </h1>
        <p className="mt-1 text-body-md text-text-secondary">
          Buat password baru untuk akun Speaking Pro Anda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label
            htmlFor="password"
            className="block text-label-md font-label-md text-on-surface-variant mb-2"
          >
            Password Baru
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              lock
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3.5 pl-12 pr-12 text-body-md text-on-surface placeholder:text-outline focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={
                showPassword ? "Sembunyikan password" : "Tampilkan password"
              }
              tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-outline hover:text-on-surface-variant transition"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirm"
            className="block text-label-md font-label-md text-on-surface-variant mb-2"
          >
            Ulangi Password Baru
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              lock_reset
            </span>
            <input
              id="confirm"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3.5 pl-12 pr-4 text-body-md text-on-surface placeholder:text-outline focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-error-container px-4 py-3 text-label-md font-label-md text-on-error-container"
          >
            {error}
          </p>
        )}

        <p className="text-label-sm font-label-sm text-text-secondary">
          Demi keamanan, semua perangkat lain akan dikeluarkan setelah password
          diganti.
        </p>

        <button
          type="submit"
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-primary-container py-4 text-body-md font-semibold text-white shadow-soft hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
        >
          {pending ? (
            "Menyimpan..."
          ) : (
            <>
              Simpan Password Baru
              <span className="material-symbols-outlined text-[20px]">
                check
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
