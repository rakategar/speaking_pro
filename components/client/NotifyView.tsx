"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotifyComposer } from "@/components/client/NotifyComposer";

type LogItem = {
  id: string;
  title: string;
  body: string;
  recipient_count: number;
  created_at: string;
};

const MAX_PER_DAY = 5;

export function NotifyView({
  participantCount,
  inactiveIds,
  history,
  sentToday,
}: {
  participantCount: number;
  inactiveIds: string[];
  history: LogItem[];
  /** Counted on the server: reading the clock during render is impure. */
  sentToday: number;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<string[] | "all" | null>(null);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          Kirim ke
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setTarget("all")}
            disabled={participantCount === 0}
            className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Seluruh peserta ({participantCount})
          </button>
          <button
            onClick={() => setTarget(inactiveIds)}
            disabled={inactiveIds.length === 0}
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-primary disabled:opacity-40"
          >
            Peserta belum aktif ({inactiveIds.length})
          </button>
        </div>
        <p className="mt-3 text-xs text-text-secondary">
          Untuk memilih peserta satu per satu, gunakan halaman Peserta. Batas
          pengiriman {MAX_PER_DAY} kali per 24 jam — terpakai {sentToday}.
        </p>
      </section>

      <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          Riwayat Pengiriman
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            Belum ada notifikasi yang dikirim.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-stroke-subtle">
            {history.map((h) => (
              <li key={h.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">{h.title}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(h.created_at).toLocaleString("id-ID")} ·{" "}
                    {h.recipient_count} penerima
                  </p>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{h.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {target !== null ? (
        <NotifyComposer
          recipients={target}
          onClose={() => setTarget(null)}
          onSent={() => {
            setTarget(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
