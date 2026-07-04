"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  // Fallback for first-entry history (PWA launch / deep link), where
  // router.back() would silently do nothing.
  return (
    <button
      type="button"
      aria-label="Kembali"
      onClick={() =>
        window.history.length > 1 ? router.back() : router.push("/dashboard")
      }
      className="p-2 -ml-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center active:scale-95"
    >
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
}
