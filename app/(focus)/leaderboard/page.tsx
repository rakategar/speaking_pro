import { createClient } from "@/lib/supabase/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { Confetti } from "@/components/leaderboard/Confetti";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = {
  rank: number;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  points: number;
  session_count: number;
  drill_count: number;
  best_score: number | null;
};

const nameOf = (row: Row) => row.full_name?.trim() || "Pengguna Speaking Pro";

// Podium ordering is 2-1-3 so the champion sits in the middle and taller.
const PODIUM_ORDER = [1, 0, 2];

const MEDAL: Record<number, { ring: string; chip: string; label: string }> = {
  1: { ring: "border-[#f5b731]", chip: "bg-[#f5b731] text-[#3d2c00]", label: "🥇" },
  2: { ring: "border-[#c3ccd6]", chip: "bg-[#c3ccd6] text-[#2b3440]", label: "🥈" },
  3: { ring: "border-[#d99a6c]", chip: "bg-[#d99a6c] text-[#3b2412]", label: "🥉" },
};

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // public.leaderboard is SECURITY DEFINER (see the 20260825 migration): RLS
  // keeps every profile owner-scoped, so this function is the only way to see
  // other users at all, and it returns nothing but name, avatar and points.
  const { data, error } = await supabase.rpc("leaderboard", { p_limit: 100 });
  const rows = ((data as Row[] | null) ?? []).map((r) => ({
    ...r,
    points: Number(r.points),
    session_count: Number(r.session_count),
    drill_count: Number(r.drill_count),
    rank: Number(r.rank),
  }));

  const me = rows.find((r) => r.user_id === user.id) ?? null;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="min-h-screen bg-background">
      {/* Only worth celebrating if there is actually a board to look at. */}
      {rows.length > 0 && <Confetti />}
      <TopAppBar variant="back" title="Leaderboard" />

      <main className="pt-32 pb-16 px-margin-mobile max-w-2xl mx-auto flex flex-col gap-4">
        {error && (
          <div className="bg-surface-card rounded-3xl shadow-soft p-6 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Leaderboard sedang tidak bisa dimuat. Coba lagi sebentar lagi.
            </p>
          </div>
        )}

        {!error && rows.length === 0 && (
          <div className="bg-surface-card rounded-3xl shadow-soft p-8 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">
              trophy
            </span>
            <p className="font-title-lg text-title-lg text-primary">
              Papan peringkat masih kosong
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Selesaikan satu sesi latihan dan Anda jadi yang pertama di sini.
            </p>
          </div>
        )}

        {podium.length > 0 && (
          <section className="flex items-end justify-center gap-3">
            {PODIUM_ORDER.map((idx) => {
              const row = podium[idx];
              if (!row) return null;
              const first = row.rank === 1;
              const medal = MEDAL[row.rank] ?? MEDAL[3];
              return (
                <div
                  key={row.user_id}
                  className={cn(
                    "relative overflow-hidden flex-1 rounded-3xl bg-surface-card shadow-soft flex flex-col items-center text-center px-2 pb-4",
                    first
                      ? "pt-8 champion-glow champion-shimmer border-2 border-[#f5b731]"
                      : "pt-6 border border-stroke-subtle",
                  )}
                >
                  {first && (
                    <span className="material-symbols-outlined crown-bob absolute top-1 text-[22px] text-[#f5b731]">
                      workspace_premium
                    </span>
                  )}
                  <UserAvatar
                    src={row.avatar_url}
                    name={nameOf(row)}
                    size={first ? 72 : 56}
                    className={cn("border-2 mb-2", medal.ring)}
                  />
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-label-sm text-label-sm mb-1",
                      medal.chip,
                    )}
                  >
                    {medal.label} #{row.rank}
                  </span>
                  <p
                    className={cn(
                      "font-title-lg text-primary leading-tight line-clamp-2",
                      first ? "text-title-lg" : "text-body-md",
                    )}
                  >
                    {nameOf(row)}
                  </p>
                  <p className="font-headline-md text-headline-md text-brand-cyan mt-1">
                    {row.points.toLocaleString("id-ID")}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    poin
                  </p>
                </div>
              );
            })}
          </section>
        )}

        {rest.length > 0 && (
          <section className="bg-surface-card rounded-3xl shadow-soft overflow-hidden">
            {rest.map((row) => {
              const isMe = row.user_id === user.id;
              return (
                <div
                  key={row.user_id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 border-b border-stroke-subtle/50 last:border-b-0",
                    isMe && "bg-secondary-container/10",
                  )}
                >
                  <span className="w-7 text-center font-title-lg text-body-md text-on-surface-variant shrink-0">
                    {row.rank}
                  </span>
                  <UserAvatar src={row.avatar_url} name={nameOf(row)} size={40} />
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-body-md text-primary truncate">
                      {nameOf(row)}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-secondary-container px-2 py-0.5 font-label-sm text-label-sm text-on-primary align-middle">
                          Anda
                        </span>
                      )}
                    </p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {row.session_count} sesi · {row.drill_count} drill
                    </p>
                  </div>
                  <span className="font-title-lg text-title-lg text-brand-cyan shrink-0">
                    {row.points.toLocaleString("id-ID")}
                  </span>
                </div>
              );
            })}
          </section>
        )}

        {/* Anyone outside the visible board still gets to see where they stand. */}
        {rows.length > 0 && !me && (
          <div className="bg-surface-card rounded-3xl shadow-soft p-5 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Anda belum masuk papan peringkat. Selesaikan satu sesi latihan
              untuk mulai mengumpulkan poin.
            </p>
          </div>
        )}

        {me && me.rank > 3 && (
          <div className="bg-primary-container text-on-primary rounded-3xl shadow-soft p-5 flex items-center gap-3">
            <span className="material-symbols-outlined text-light-aqua">trophy</span>
            <div className="flex-1">
              <p className="font-label-sm text-label-sm text-white/70">
                Peringkat Anda
              </p>
              <p className="font-headline-md text-headline-md">
                #{me.rank} · {me.points.toLocaleString("id-ID")} poin
              </p>
            </div>
          </div>
        )}

        <p className="font-label-sm text-label-sm text-on-surface-variant text-center px-4 leading-relaxed">
          Poin dihitung dari total skor seluruh analisis AI Anda, ditambah 10
          poin untuk setiap drill harian yang diselesaikan.
        </p>
      </main>
    </div>
  );
}
