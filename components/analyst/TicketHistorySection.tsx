"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Ticket = {
  id: string;
  code: string;
  batch_label: string | null;
  duration_days: number;
  status: string;
  redeemed_at: string | null;
  created_at: string;
  redeemed_by_name: string | null;
  redeemed_by_email: string | null;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  unused: {
    label: "Belum Ditukar",
    className: "bg-surface-container text-text-secondary",
  },
  redeemed: { label: "Sudah Ditukar", className: "bg-green-100 text-green-700" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function TicketHistorySection({ reloadKey }: { reloadKey?: number }) {
  const [items, setItems] = useState<Ticket[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unused" | "redeemed">(
    "all",
  );
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/analyst/tickets", { cache: "no-store" });
    if (!res.ok) {
      setError(`Gagal memuat riwayat (HTTP ${res.status})`);
      return;
    }
    setError(null);
    const json = await res.json();
    setItems(json.items ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.code.toLowerCase().includes(q) ||
        (t.batch_label ?? "").toLowerCase().includes(q) ||
        (t.redeemed_by_name ?? "").toLowerCase().includes(q) ||
        (t.redeemed_by_email ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, statusFilter]);

  const redeemedCount = items.filter((t) => t.status === "redeemed").length;

  return (
    <div>
      <h2 className="mb-3 text-lg font-bold text-primary">
        Riwayat Ticket{" "}
        <span className="text-sm font-normal text-text-secondary">
          ({redeemedCount} sudah ditukar dari {items.length} kode)
        </span>
      </h2>

      <div className="rounded-2xl border border-stroke-subtle bg-surface-card shadow-soft">
        <div className="flex flex-wrap items-center gap-3 border-b border-stroke-subtle p-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode / batch / penukar..."
            className="w-full max-w-xs rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "unused" | "redeemed")
            }
            className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none"
          >
            <option value="all">Semua status</option>
            <option value="unused">Belum ditukar</option>
            <option value="redeemed">Sudah ditukar</option>
          </select>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="max-h-[32rem] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-stroke-subtle bg-surface-card text-xs text-text-secondary">
              <tr>
                {["kode", "batch", "durasi", "status", "penukar", "dibuat"].map(
                  (h) => (
                    <th key={h} className="px-3 py-2 font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const meta = STATUS_META[t.status] ?? STATUS_META.unused;
                return (
                  <tr key={t.id} className="border-b border-stroke-subtle/50">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs font-semibold tracking-wider text-primary">
                      {t.code}
                    </td>
                    <td className="px-3 py-2 text-text-secondary">
                      {t.batch_label ?? "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-text-secondary">
                      {t.duration_days} hari
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {t.redeemed_by_email ? (
                        <>
                          <p className="font-semibold text-primary">
                            {t.redeemed_by_name ?? "(tanpa nama)"}
                          </p>
                          <p className="font-mono text-xs text-text-secondary">
                            {t.redeemed_by_email}
                          </p>
                          {t.redeemed_at && (
                            <p className="text-xs text-text-secondary">
                              {fmtDate(t.redeemed_at)}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-text-secondary">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-text-secondary">
                      {fmtDate(t.created_at)}
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-text-secondary"
                  >
                    {items.length
                      ? "Tidak ada yang cocok."
                      : "Belum ada kode ticket."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
