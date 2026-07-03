"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Kembali"
      onClick={() => router.back()}
      className="p-2 -ml-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center active:scale-95"
    >
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
}
