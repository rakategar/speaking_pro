"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// The TopAppBar bell: fetches the caller's unread count and shows a badge,
// tapping through to /notifications. Rendered inside the (already client)
// TopAppBar, so it lights up on every page that uses the bar with no
// per-page wiring.
export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setUnread(data.unread ?? 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push("/notifications")}
      className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary"
      aria-label={unread > 0 ? `Notifikasi (${unread} belum dibaca)` : "Notifikasi"}
    >
      <span
        className="material-symbols-outlined"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        notifications
      </span>
      {unread > 0 && (
        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold leading-4 text-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
