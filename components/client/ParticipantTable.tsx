"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ParticipantRow, ParticipantStatus } from "@/lib/client/analytics";
import { NotifyComposer } from "@/components/client/NotifyComposer";
import { periodQuery, type Period } from "@/lib/client/period";

const STATUS_STYLE: Record<ParticipantStatus, string> = {
  aktif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  melambat: "bg-amber-50 text-amber-700 border-amber-200",
  "tidak aktif": "bg-red-50 text-red-600 border-red-200",
};

const round1 = (v: number | null) =>
  v == null ? "–" : (Math.round(v * 10) / 10).toLocaleString("id-ID");

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "–";

export function ParticipantTable({
  participants,
  period,
}: {
  participants: ParticipantRow[];
  period: Period;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ParticipantStatus | "semua">("semua");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return participants.filter((p) => {
      if (status !== "semua" && p.status !== status) return false;
      if (!q) return true;
      return (
        (p.name ?? "").toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
      );
    });
  }, [participants, query, status]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.userId));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      // Operates on the filtered view, not the whole list: ticking the header
      // while a filter is on must not silently select rows off screen.
      if (allFilteredSelected) filtered.forEach((p) => next.delete(p.userId));
      else filtered.forEach((p) => next.add(p.userId));
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau email"
          className="min-w-[220px] flex-1 rounded-full border border-stroke-subtle bg-surface-card px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
        />
        <div className="flex gap-1 rounded-full border border-stroke-subtle bg-surface-card p-1">
          {(["semua", "aktif", "melambat", "tidak aktif"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={
                status === s
                  ? "rounded-full bg-primary-container px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full px-3 py-1 text-xs font-semibold text-text-secondary hover:text-primary"
              }
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setComposing(true)}
          disabled={selected.size === 0}
          className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Kirim Notifikasi ({selected.size})
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stroke-subtle bg-surface-card shadow-soft">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-stroke-subtle text-left text-xs uppercase tracking-wider text-text-secondary">
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAllFiltered}
                  aria-label="Pilih semua yang tampil"
                />
              </th>
              <th className="p-3">Peserta</th>
              <th className="p-3">Status</th>
              <th className="p-3">Sesi</th>
              <th className="p-3">Menit</th>
              <th className="p-3">Rata-rata</th>
              <th className="p-3">Perubahan</th>
              <th className="p-3">Terakhir latihan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.userId} className="border-b border-stroke-subtle/60">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.has(p.userId)}
                    onChange={() => toggleOne(p.userId)}
                    aria-label={`Pilih ${p.name ?? p.email}`}
                  />
                </td>
                <td className="p-3">
                  <Link
                    href={`/client/participants/${p.userId}?${periodQuery(period)}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {p.name ?? "(tanpa nama)"}
                  </Link>
                  <p className="text-xs text-text-secondary">{p.email}</p>
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[p.status]}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="p-3">
                  {p.sessions}
                  {p.drills > 0 ? (
                    <span className="text-xs text-text-secondary"> +{p.drills}d</span>
                  ) : null}
                </td>
                <td className="p-3">{p.minutes}</td>
                <td className="p-3 font-semibold">{round1(p.avgOverall)}</td>
                <td className="p-3">
                  {p.deltaOverall == null ? (
                    <span className="text-text-secondary">–</span>
                  ) : (
                    <span
                      className={
                        p.deltaOverall >= 0 ? "text-emerald-600" : "text-red-500"
                      }
                    >
                      {p.deltaOverall > 0 ? "+" : ""}
                      {round1(p.deltaOverall)}
                    </span>
                  )}
                </td>
                <td className="p-3 text-text-secondary">{fmtDate(p.lastActiveAt)}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-text-secondary">
                  Tidak ada peserta yang cocok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {composing ? (
        <NotifyComposer
          recipients={[...selected]}
          onClose={() => setComposing(false)}
          onSent={() => {
            setComposing(false);
            setSelected(new Set());
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
