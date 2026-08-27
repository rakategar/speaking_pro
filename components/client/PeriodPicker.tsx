"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ALLOWED_DAYS, MAX_RANGE_DAYS, type Period } from "@/lib/client/period";

/**
 * The reporting window.
 *
 * The choice is written to the URL rather than held in component state, so the
 * server component re-renders with real data for the new period instead of the
 * client filtering a payload it was already given.
 */
export function PeriodPicker({ period }: { period: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [open, setOpen] = useState(!period.preset);
  const [from, setFrom] = useState(period.from ?? "");
  const [to, setTo] = useState(period.to ?? "");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  function selectDays(value: number) {
    const next = new URLSearchParams(params.toString());
    next.set("days", String(value));
    next.delete("from");
    next.delete("to");
    setOpen(false);
    router.push(`${pathname}?${next.toString()}`);
  }

  function applyRange() {
    if (!from || !to) return;
    const next = new URLSearchParams(params.toString());
    next.set("from", from);
    next.set("to", to);
    next.delete("days");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-1 rounded-full border border-stroke-subtle bg-surface-card p-1">
        {ALLOWED_DAYS.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => selectDays(o)}
            className={
              period.preset && period.days === o
                ? "rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-white"
                : "rounded-full px-3 py-1 text-xs font-semibold text-text-secondary hover:text-primary"
            }
          >
            {o} hari
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={
            !period.preset
              ? "rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-white"
              : "rounded-full px-3 py-1 text-xs font-semibold text-text-secondary hover:text-primary"
          }
        >
          Kustom
        </button>
      </div>

      {open && (
        <div className="flex flex-wrap items-end justify-end gap-2 rounded-2xl border border-stroke-subtle bg-surface-card p-3 shadow-soft">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Dari
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stroke-subtle bg-surface-container-low px-2 py-1 text-sm text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Sampai
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-stroke-subtle bg-surface-container-low px-2 py-1 text-sm text-primary"
            />
          </label>
          <button
            type="button"
            onClick={applyRange}
            disabled={!from || !to}
            className="rounded-full bg-primary-container px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Terapkan
          </button>
          <p className="w-full text-right text-[11px] text-text-secondary">
            Maksimal {MAX_RANGE_DAYS} hari. Tanggal mengikuti waktu Jakarta.
          </p>
        </div>
      )}
    </div>
  );
}
