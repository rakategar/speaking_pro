"use client";

import { useState } from "react";
import { ALLOWED_DAYS, MAX_RANGE_DAYS } from "@/lib/client/period";

/**
 * Download links for the cohort PDF.
 *
 * The presets are plain anchors -- nothing to compute. The custom range builds
 * its own href as the two dates are filled in, and stays disabled until both
 * are set, so the server never has to reject a half-formed request the user
 * could see was incomplete.
 */
export function ReportRangePicker() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const ready = Boolean(from && to && from <= to);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {ALLOWED_DAYS.map((days) => (
          <a
            key={days}
            href={`/api/client/reports?days=${days}`}
            className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Unduh {days} hari terakhir
          </a>
        ))}
      </div>

      <div className="rounded-2xl border border-stroke-subtle bg-surface-container-low p-4">
        <p className="text-sm font-semibold text-primary">Rentang tanggal sendiri</p>
        <p className="mt-1 text-xs text-text-secondary">
          Misalnya persis mengikuti tanggal mulai dan selesai program training
          Anda. Maksimal {MAX_RANGE_DAYS} hari, mengikuti waktu Jakarta.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Dari
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-stroke-subtle bg-surface-card px-2 py-1.5 text-sm text-primary"
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
              className="rounded-lg border border-stroke-subtle bg-surface-card px-2 py-1.5 text-sm text-primary"
            />
          </label>
          {ready ? (
            <a
              href={`/api/client/reports?from=${from}&to=${to}`}
              className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Unduh rentang ini
            </a>
          ) : (
            <span className="cursor-not-allowed rounded-full bg-primary-container/40 px-4 py-2 text-sm font-semibold text-white">
              Unduh rentang ini
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
