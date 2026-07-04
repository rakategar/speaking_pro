"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ENVIRONMENTS } from "@/components/recording/environments";
import { EnablePush } from "@/components/push/EnablePush";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  created_at: string;
  status: string;
  environment: string | null;
  duration_seconds: number | null;
  module_title: string | null;
  module_category: string | null;
  overall_score: number | null;
};

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  analyzed: { text: "Selesai", className: "bg-secondary-fixed/60 text-on-secondary-fixed" },
  drill_completed: { text: "Drill", className: "bg-tertiary-fixed/40 text-on-tertiary-fixed" },
  failed: { text: "Gagal", className: "bg-error-container text-on-error-container" },
  queued: { text: "Dalam Antrean", className: "bg-tertiary-container/60 text-on-tertiary-container" },
  analyzing: { text: "Sedang Dianalisis", className: "bg-tertiary-container/60 text-on-tertiary-container" },
  uploaded: { text: "Terunggah", className: "bg-surface-container text-on-surface-variant" },
  uploading: { text: "Mengunggah", className: "bg-surface-container text-on-surface-variant" },
};

// Statuses that will still change on their own -- keep the list fresh.
const PENDING = new Set(["queued", "analyzing", "uploaded", "uploading"]);

function scoreColor(score: number): string {
  if (score >= 80) return "text-secondary-container";
  if (score >= 60) return "text-secondary";
  return "text-orange-500";
}

export function HistoryList({ items: initial }: { items: Item[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Server component re-renders bring fresh statuses; poll while any
  // recording is still queued/being analyzed.
  const hasPending = initial.some((i) => PENDING.has(i.status));
  useEffect(() => {
    setItems(initial);
    if (!hasPending) return;
    const t = setInterval(() => router.refresh(), 10_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, hasPending]);

  async function remove(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/recordings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        router.refresh();
      }
    } finally {
      setDeleting(null);
      setConfirming(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-secondary-container/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-secondary-container text-[40px]">
            history
          </span>
        </div>
        <div>
          <h2 className="font-title-lg text-title-lg text-primary">
            Belum Ada Riwayat
          </h2>
          <p className="text-body-md text-text-secondary mt-1 max-w-xs">
            Mulai rekam latihan pertama Anda dan rapor analisisnya akan muncul
            di sini.
          </p>
        </div>
        <Link
          href="/record"
          className="mt-2 bg-secondary-container text-on-secondary rounded-full px-8 py-3 font-semibold shadow-md active:scale-95 transition"
        >
          Mulai Rekam
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-bento-gap">
      {hasPending && (
        <div className="bg-tertiary-container/40 border border-tertiary/20 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-on-tertiary-container">
            <span className="material-symbols-outlined text-[20px] animate-spin [animation-duration:2.5s]">
              progress_activity
            </span>
            <p className="text-label-md font-label-md">
              Ada rekaman dalam antrean analisis. Halaman ini diperbarui
              otomatis — atau aktifkan notifikasi agar dikabari saat selesai.
            </p>
          </div>
          <EnablePush />
        </div>
      )}
      {items.map((item) => {
        const status = STATUS_LABEL[item.status] ?? {
          text: item.status,
          className: "bg-surface-container text-on-surface-variant",
        };
        const env = ENVIRONMENTS.find((e) => e.slug === item.environment);
        const hasReport = item.status === "analyzed";
        const date = new Date(item.created_at).toLocaleDateString("id-ID", {
          weekday: "short",
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        const card = (
          <div
            className={cn(
              "bg-surface-card rounded-2xl p-4 flex items-center gap-4 shadow-soft border border-stroke-subtle transition-colors",
              hasReport && "hover:border-brand-cyan/50",
            )}
          >
            {/* Score / icon */}
            <div className="w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-brand-cyan/10" />
              {item.overall_score !== null ? (
                <span
                  className={cn(
                    "relative z-10 font-heading text-title-lg font-bold",
                    scoreColor(item.overall_score),
                  )}
                >
                  {item.overall_score}
                </span>
              ) : (
                <span className="material-symbols-outlined text-primary relative z-10">
                  {item.status === "drill_completed" ? "fitness_center" : "mic"}
                </span>
              )}
            </div>

            <div className="flex-grow min-w-0">
              <h4 className="text-[15px] leading-tight text-primary font-semibold mb-0.5 truncate">
                {item.module_title ?? "Rekaman Bebas"}
                {env ? ` • ${env.label}` : ""}
              </h4>
              <p className="font-label-sm text-label-sm text-text-secondary">
                {date}
                {item.duration_seconds
                  ? ` • ${Math.round(item.duration_seconds / 60) || "<1"} mnt`
                  : ""}
              </p>
              <span
                className={cn(
                  "inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  status.className,
                )}
              >
                {status.text}
              </span>
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setConfirming(item.id);
              }}
              disabled={deleting === item.id}
              className="w-9 h-9 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/40 transition-colors shrink-0"
              aria-label="Hapus rekaman"
            >
              <span className="material-symbols-outlined text-[20px]">
                {deleting === item.id ? "hourglass_top" : "delete"}
              </span>
            </button>

            {hasReport && (
              <span className="material-symbols-outlined text-on-surface-variant -ml-2">
                chevron_right
              </span>
            )}
          </div>
        );

        return (
          <div key={item.id}>
            {hasReport ? (
              <Link href={`/report/${item.id}`}>{card}</Link>
            ) : (
              card
            )}
            {confirming === item.id && (
              <div className="mt-2 bg-error-container/40 border border-error/20 rounded-2xl p-4 flex items-center justify-between gap-3">
                <p className="text-label-md font-label-md text-on-error-container">
                  Hapus rekaman ini beserta rapornya?
                </p>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="px-4 py-2 rounded-full text-label-md font-label-md text-on-surface border border-outline-variant"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    disabled={deleting === item.id}
                    className="px-4 py-2 rounded-full text-label-md font-label-md bg-error text-on-error disabled:opacity-60"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
