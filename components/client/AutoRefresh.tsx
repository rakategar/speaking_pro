"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 30_000;

/**
 * Keeps the monitoring pages current without a manual reload.
 *
 * A poll rather than a websocket: these pages are server components with
 * `dynamic = "force-dynamic"`, so router.refresh() genuinely re-runs the
 * queries, and nothing new has to be exposed to Realtime for it to work.
 *
 * Polling pauses while the tab is hidden -- a dashboard left open on a second
 * monitor overnight should not keep hitting the database every 30 seconds.
 *
 * `renderedAt` comes from the server: reading the clock in a component body is
 * impure and React's lint rules reject it (that rule has already bitten this
 * codebase twice).
 */
export function AutoRefresh({ renderedAt }: { renderedAt: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const onVisibility = () => setPaused(document.visibilityState !== "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      startTransition(() => router.refresh());
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, router]);

  const clock = new Date(renderedAt).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  });

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span
        className={
          paused
            ? "h-1.5 w-1.5 rounded-full bg-text-secondary/40"
            : "h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
        }
      />
      <span>
        Diperbarui {clock} WIB
        {paused ? " · jeda saat tab tidak aktif" : " · menyegarkan tiap 30 detik"}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        className="ml-auto flex items-center gap-1 rounded-full border border-stroke-subtle px-3 py-1 font-semibold text-primary transition-colors hover:bg-surface-container-high disabled:opacity-50"
      >
        <span
          className={`material-symbols-outlined text-[14px] ${pending ? "animate-spin" : ""}`}
        >
          refresh
        </span>
        {pending ? "Menyegarkan…" : "Segarkan"}
      </button>
    </div>
  );
}
