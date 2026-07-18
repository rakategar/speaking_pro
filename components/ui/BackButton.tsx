"use client";

import { useGoBack } from "@/components/ui/useGoBack";

export function BackButton() {
  const { goBack, navigating } = useGoBack();
  return (
    <button
      type="button"
      aria-label="Kembali"
      aria-busy={navigating}
      onClick={goBack}
      className="p-2 -ml-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center active:scale-95 disabled:opacity-100"
    >
      <span
        className={
          navigating
            ? "material-symbols-outlined opacity-60 transition-opacity"
            : "material-symbols-outlined transition-opacity"
        }
      >
        arrow_back
      </span>
    </button>
  );
}
