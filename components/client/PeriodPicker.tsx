"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const OPTIONS = [7, 30, 90];

/** Period is a URL param so the server component re-renders with real data. */
export function PeriodPicker({ days }: { days: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function select(value: number) {
    const next = new URLSearchParams(params.toString());
    next.set("days", String(value));
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex gap-1 rounded-full border border-stroke-subtle bg-surface-card p-1">
      {OPTIONS.map((o) => (
        <button
          key={o}
          onClick={() => select(o)}
          className={
            days === o
              ? "rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-white"
              : "rounded-full px-3 py-1 text-xs font-semibold text-text-secondary hover:text-primary"
          }
        >
          {o} hari
        </button>
      ))}
    </div>
  );
}
