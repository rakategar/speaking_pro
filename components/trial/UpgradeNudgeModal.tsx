"use client";

import { useRouter } from "next/navigation";
import { FaisalAvatar } from "@/components/ui/FaisalAvatar";

type Props = {
  variant?: "soft" | "hard";
  title?: string;
  body?: string;
  onClose: () => void;
};

// Shared paywall overlay for: locked-module taps (Library/drill routes),
// blurred report sections, and the day-3/5/7 trial upgrade nudges. Follows
// the same overlay pattern as ChangePasswordModal (components/settings/
// SettingsView.tsx) / the analyst Modal (app/analyst/page.tsx). Callers that
// pass no title/body fall back to generic paywall copy; the trial day-3/5/7
// nudges pass their own (components/trial/TrialNudgeGate.tsx).
export function UpgradeNudgeModal({ variant = "soft", title, body, onClose }: Props) {
  const router = useRouter();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <FaisalAvatar
            expression={variant === "hard" ? "doubtful" : "finger-heart"}
            size={80}
          />
          <h3 className="font-title-lg text-title-lg text-on-surface">
            {title ?? (variant === "hard" ? "Trial 7 Hari Kamu Segera Berakhir" : "Upgrade untuk Hasil Lengkap")}
          </h3>
          <p className="text-body-md text-text-secondary">
            {body ??
              (variant === "hard"
                ? "Trial gratismu segera berakhir. Upgrade ke Premium agar latihan, rekaman, dan analisis kamu tetap berjalan."
                : "Fitur ini tersedia untuk pengguna Premium. Upgrade untuk membuka analisis lengkap, rekaman tanpa batas, dan seluruh modul latihan.")}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/subscription/renew")}
            className="w-full rounded-full bg-primary-container py-3.5 font-label-md text-label-md font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.99]"
          >
            Upgrade Sekarang
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full py-3 font-label-md text-label-md font-medium text-text-secondary transition hover:opacity-80"
          >
            Nanti saja
          </button>
        </div>
      </div>
    </div>
  );
}
