"use client";

import { useRouter } from "next/navigation";

// The TopAppBar trophy, sitting immediately left of the NotificationBell.
// Deliberately a plain navigation button with no badge and no fetch -- unlike
// the bell there is no per-user count worth loading on every screen.
export function LeaderboardButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/leaderboard")}
      className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary"
      aria-label="Leaderboard"
    >
      <span
        className="material-symbols-outlined"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        trophy
      </span>
    </button>
  );
}
