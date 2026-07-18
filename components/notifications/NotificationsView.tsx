"use client";

import { useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffMin = Math.floor((Date.now() - then) / 60000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NotificationsView({ items }: { items: NotificationItem[] }) {
  // Clear the unread badge as soon as the list is opened.
  useEffect(() => {
    if (items.some((n) => !n.read_at)) {
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }).catch(() => {});
    }
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 px-6">
        <span className="material-symbols-outlined text-[48px] text-text-secondary mb-3">
          notifications_off
        </span>
        <p className="text-body-md text-text-secondary">
          Belum ada notifikasi. Semua pembaruan latihan dan pembelian Anda akan
          muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {items.map((n) => {
        const inner = (
          <div
            className={cn(
              "rounded-2xl border p-4 transition-colors",
              n.read_at
                ? "bg-surface-card border-stroke-subtle"
                : "bg-secondary-container/10 border-secondary-container/40",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-title-sm font-title-sm text-on-surface">
                {n.title}
              </h3>
              {!n.read_at && (
                <span className="mt-1 w-2 h-2 rounded-full bg-secondary-container shrink-0" />
              )}
            </div>
            {n.body && (
              <p className="mt-1 text-body-sm text-on-surface-variant">{n.body}</p>
            )}
            <p className="mt-2 text-label-sm text-text-secondary">
              {timeAgo(n.created_at)}
            </p>
          </div>
        );
        return (
          <li key={n.id}>
            {n.url ? (
              <Link href={n.url} className="block active:scale-[0.99] transition-transform">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
