import Link from "next/link";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";

export type LeaderboardRow = {
  rank: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  session_count: number;
  drill_count: number;
  best_score: number | null;
};

const nameOf = (row: LeaderboardRow) => row.full_name?.trim() || "Pengguna Speaking Pro";

const MEDAL: Record<number, { ring: string; label: string }> = {
  1: { ring: "border-[#f5b731]", label: "🥇" },
  2: { ring: "border-[#c3ccd6]", label: "🥈" },
  3: { ring: "border-[#d99a6c]", label: "🥉" },
};

/**
 * The leaderboard's hook, on the home screen.
 *
 * Shows the top three and where the viewer stands, so the competitive pull
 * lands the moment the app opens instead of waiting behind a tap on the
 * trophy in the app bar. The full board stays at /leaderboard.
 *
 * Renders nothing on an empty board -- a podium with no one on it is a worse
 * first impression than no card at all.
 */
export function LeaderboardTeaser({
  rows,
  userId,
}: {
  rows: LeaderboardRow[];
  userId: string;
}) {
  if (rows.length === 0) return null;

  const podium = rows.slice(0, 3);
  const me = rows.find((r) => r.user_id === userId) ?? null;
  // The person directly above the viewer: the concrete, closeable gap is the
  // trigger, far more than an abstract rank number.
  const ahead = me && me.rank > 1 ? rows.find((r) => r.rank === me.rank - 1) : null;
  const gap = me && ahead ? ahead.points - me.points : null;

  return (
    <Link
      href="/leaderboard"
      className="bento-card flex flex-col gap-4 rounded-3xl border border-stroke-subtle bg-surface-container-lowest p-6 transition-transform active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[20px] text-[#f5b731]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            trophy
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-secondary-container">
            Papan Peringkat
          </span>
        </div>
        <span className="material-symbols-outlined text-[18px] text-text-secondary">
          chevron_right
        </span>
      </div>

      {/* Top three, left to right */}
      <div className="flex items-stretch gap-2">
        {podium.map((row) => {
          const medal = MEDAL[row.rank] ?? MEDAL[3];
          const isMe = row.user_id === userId;
          return (
            <div
              key={row.user_id}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3 text-center",
                isMe
                  ? "border-secondary-container/50 bg-secondary-container/10"
                  : "border-stroke-subtle bg-surface-card",
              )}
            >
              <UserAvatar
                src={row.avatar_url}
                name={nameOf(row)}
                size={40}
                className={cn("border-2", medal.ring)}
              />
              <span className="text-[11px] leading-tight">{medal.label}</span>
              <p className="line-clamp-1 w-full text-[11px] font-semibold text-primary">
                {isMe ? "Anda" : nameOf(row).split(" ")[0]}
              </p>
              <p className="text-xs font-bold tabular-nums text-brand-cyan">
                {row.points.toLocaleString("id-ID")}
              </p>
            </div>
          );
        })}
      </div>

      {/* Where the viewer stands */}
      {me ? (
        me.rank > 3 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-stroke-subtle bg-surface-card p-3">
            <span className="w-8 shrink-0 text-center text-sm font-bold text-primary">
              #{me.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-primary">Peringkat Anda</p>
              <p className="text-xs text-text-secondary">
                {gap !== null && gap > 0
                  ? `Kurang ${gap.toLocaleString("id-ID")} poin untuk naik ke #${me.rank - 1}.`
                  : `${me.points.toLocaleString("id-ID")} poin terkumpul.`}
              </p>
            </div>
            <span className="text-sm font-bold tabular-nums text-brand-cyan">
              {me.points.toLocaleString("id-ID")}
            </span>
          </div>
        ) : (
          <p className="rounded-2xl border border-stroke-subtle bg-surface-card p-3 text-center text-xs text-text-secondary">
            Anda ada di podium — pertahankan posisinya. 🔥
          </p>
        )
      ) : (
        <p className="rounded-2xl border border-stroke-subtle bg-surface-card p-3 text-center text-xs text-text-secondary">
          Selesaikan satu sesi latihan untuk mulai mengumpulkan poin dan masuk
          papan peringkat.
        </p>
      )}
    </Link>
  );
}
