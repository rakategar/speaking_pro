import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MODULE_META } from "@/lib/modules";
import { DAILY_GOAL_MINUTES } from "@/lib/drills/content";
import {
  dailyPlan,
  jakartaDayIndex,
  jakartaStartOfToday,
  type ReportSignals,
} from "@/lib/drills/plan";

export const dynamic = "force-dynamic";

const DAY_INITIALS = ["S", "S", "R", "K", "J", "S", "M"]; // Senin..Minggu

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("id-ID", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    }).format(now),
  );
  if (hour < 11) return "Selamat Pagi,";
  if (hour < 15) return "Selamat Siang,";
  if (hour < 19) return "Selamat Sore,";
  return "Selamat Malam,";
}

function startOfIsoWeek(now: Date): Date {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy already gates this route

  const now = new Date();
  const weekStart = startOfIsoWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const todayStart = jakartaStartOfToday(now);

  const [
    { data: profile },
    { data: weekRecordings },
    { data: history },
    { data: latestAnalyzed },
    { data: latestReport },
    { data: todayDrills },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, streak_count")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("recordings")
      .select("id, created_at, module_id, status")
      .gte("created_at", weekStart.toISOString()),
    supabase
      .from("score_history")
      .select("overall_score, recorded_at")
      .gte("recorded_at", monthStart.toISOString())
      .order("recorded_at", { ascending: true }),
    supabase
      .from("recordings")
      .select("id")
      .eq("status", "analyzed")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("reports")
      .select(
        "confidence_score, clarity_score, structure_score, intonation_score, wpm, filler_word_count",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("recordings")
      .select("duration_seconds")
      .eq("status", "drill_completed")
      .gte("created_at", todayStart.toISOString()),
  ]);

  const name = profile?.full_name ?? user.email?.split("@")[0] ?? "Speaker";

  // Personalized daily menu from the latest report's weak points; rotates
  // per calendar day (Asia/Jakarta). Falls back to a balanced rotation.
  const plan = dailyPlan(
    (latestReport as ReportSignals | null) ?? null,
    jakartaDayIndex(now),
  );
  const { data: planModules } = await supabase
    .from("practice_modules")
    .select("slug, title, category, duration_minutes")
    .in(
      "slug",
      plan.map((p) => p.slug),
    );
  const planWithTitles = plan.map((p) => ({
    ...p,
    module: planModules?.find((m) => m.slug === p.slug) ?? null,
  }));
  const personalized = latestReport !== null;

  // Today's practiced minutes toward the 10-minute daily goal.
  const todayMinutes = Math.floor(
    (todayDrills ?? []).reduce((s, r) => s + (r.duration_seconds ?? 0), 0) / 60,
  );
  const goalPct = Math.min(
    100,
    Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100),
  );

  // Which weekdays (Mon..Sun) have at least one recording this week.
  const activeDays = new Set(
    (weekRecordings ?? []).map(
      (r) => (new Date(r.created_at).getDay() + 6) % 7,
    ),
  );
  // Drills count toward the streak, but the weekly submission badge only
  // flips for a real audio upload.
  const submittedThisWeek = (weekRecordings ?? []).some((r) =>
    ["uploaded", "analyzing", "analyzed"].includes(r.status),
  );

  // Month progress: first vs latest score point this month.
  const scores = history ?? [];
  const monthDelta =
    scores.length >= 2
      ? Math.round(
          ((scores[scores.length - 1].overall_score -
            scores[0].overall_score) /
            Math.max(1, scores[0].overall_score)) *
            100,
        )
      : null;

  // Sparkline path from up to 6 latest points (scores mapped to 40..100).
  const spark = scores.slice(-6).map((s) => s.overall_score);
  const sparkY = (v: number) =>
    Math.max(2, Math.min(38, 38 - ((v - 40) / 60) * 36));
  const sparkPath =
    spark.length >= 2
      ? spark
          .map((v, i) => {
            const x = (i / (spark.length - 1)) * 100;
            return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${sparkY(v).toFixed(1)}`;
          })
          .join(" ")
      : null;

  return (
    <div className="w-full max-w-md mx-auto relative pb-[120px]">
      {/* TopAppBar: greeting variant */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-margin-mobile py-4 w-full max-w-md mx-auto">
          <Link href="/profile" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-stroke-subtle bg-secondary-container text-on-secondary flex items-center justify-center font-heading font-bold overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-text-secondary">
                {greeting(now)}
              </span>
              <span className="font-heading text-lg font-bold text-primary tracking-tight">
                {name}
              </span>
            </div>
          </Link>
          <button
            type="button"
            className="relative text-primary hover:opacity-80 active:scale-95 transition-all flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest border border-stroke-subtle shadow-sm"
            aria-label="Notifikasi"
          >
            <span className="material-symbols-outlined text-[20px]">
              notifications
            </span>
          </button>
        </div>
      </header>

      <main className="px-margin-mobile pt-24 flex flex-col gap-bento-gap">
        {/* Hero: personalized daily drill menu */}
        <div className="bg-surface-container-lowest border border-stroke-subtle bento-card rounded-3xl p-6 flex flex-col gap-5">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-secondary-container uppercase tracking-wider">
                Latihan Harian Anda
              </span>
              <h2 className="font-heading text-xl font-bold text-primary-container">
                {personalized
                  ? "Menu dari rapor terakhir Anda"
                  : "Menu latihan hari ini"}
              </h2>
            </div>
            <div
              className={
                goalPct >= 100
                  ? "bg-secondary-container text-on-secondary px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0"
                  : "bg-secondary-fixed/40 text-secondary border border-secondary-fixed/50 px-3 py-1.5 rounded-full flex items-center gap-1 shrink-0"
              }
            >
              <span className="material-symbols-outlined text-[16px]">
                {goalPct >= 100 ? "task_alt" : "timer"}
              </span>
              <span className="text-xs font-semibold">
                {todayMinutes}/{DAILY_GOAL_MINUTES} mnt
              </span>
            </div>
          </div>

          {/* 10-minute daily goal */}
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 rounded-full bg-surface-container overflow-hidden">
              <div
                className={
                  goalPct >= 100
                    ? "h-full bg-light-aqua rounded-full shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                    : "h-full bg-secondary-container rounded-full"
                }
                style={{ width: `${Math.max(goalPct, 2)}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">
              {goalPct >= 100
                ? "Target 10 menit hari ini tercapai — luar biasa! 🎉"
                : `${DAILY_GOAL_MINUTES - todayMinutes} menit lagi menuju target harian.`}
            </span>
          </div>

          {/* Today's drills */}
          <div className="flex flex-col gap-2">
            {planWithTitles.map((p, i) => (
              <Link
                key={p.slug}
                href={MODULE_META[p.slug]?.route ?? `/drill/${p.slug}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-stroke-subtle hover:border-brand-cyan/50 active:scale-[0.99] transition"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-[20px]">
                    {MODULE_META[p.slug]?.icon ?? "mic"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate">
                    {i + 1}. {p.module?.title ?? p.slug}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {p.category} · {p.module?.duration_minutes ?? 5} mnt
                  </p>
                </div>
                <span className="material-symbols-outlined text-secondary-container">
                  play_circle
                </span>
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-text-secondary">
                Streak Minggu Ini
              </span>
              <span className="text-sm font-bold text-secondary-container">
                {activeDays.size}/7
              </span>
            </div>
            <div className="flex justify-between items-center">
              {DAY_INITIALS.map((initial, i) => (
                <div
                  key={i}
                  className={
                    activeDays.has(i)
                      ? "w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary text-sm font-semibold shadow-sm"
                      : "w-8 h-8 rounded-full bg-surface-container border border-stroke-subtle flex items-center justify-center text-text-secondary text-sm font-medium"
                  }
                >
                  {initial}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly Submission (dark bento) */}
        <div className="bg-primary-container border border-primary-fixed/20 rounded-3xl p-6 relative overflow-hidden flex flex-col gap-5 shadow-lg">
          <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />
          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col gap-0.5">
              <h3 className="font-heading text-lg font-bold text-on-primary tracking-tight">
                Rekaman Mingguan
              </h3>
              <span className="text-sm text-primary-fixed-dim">
                Durasi Maks 5 Menit
              </span>
            </div>
            <div className="bg-surface-variant/20 border border-surface-variant/30 text-on-primary px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
              <span
                className={
                  submittedThisWeek
                    ? "w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                    : "w-1.5 h-1.5 rounded-full bg-light-aqua animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                }
              />
              <span className="text-xs font-medium">
                {submittedThisWeek ? "Terkirim" : "Belum Dikirim"}
              </span>
            </div>
          </div>

          {/* Decorative audio wave */}
          <div className="h-14 mt-1 flex items-center gap-1.5 justify-center z-10">
            {[4, 8, 12, 6, 10, 14, 8, 5, 9, 4].map((h, i) => (
              <div
                key={i}
                className={`w-1.5 bg-light-aqua rounded-full ${
                  h >= 12
                    ? "shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                    : h >= 9
                      ? "opacity-80"
                      : h >= 6
                        ? "opacity-60"
                        : "opacity-40"
                }`}
                style={{ height: `${h * 4}px` }}
              />
            ))}
          </div>

          <Link
            href="/record"
            className="bg-transparent border border-light-aqua/60 text-light-aqua rounded-2xl py-3 flex items-center justify-center gap-2 hover:bg-light-aqua/10 active:scale-95 transition-all z-10"
          >
            <span className="material-symbols-outlined text-[20px]">mic</span>
            <span className="text-sm font-semibold">
              {submittedThisWeek ? "Rekam Lagi" : "Rekam Sekarang"}
            </span>
          </Link>
        </div>

        {/* Progress Snap */}
        <Link
          href={latestAnalyzed ? `/report/${latestAnalyzed.id}` : "/record"}
          className="bg-surface-container-lowest border border-stroke-subtle bento-card rounded-3xl p-6 flex items-center justify-between py-8 active:scale-[0.99] transition-transform"
        >
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-text-secondary">
              Perkembangan Kinerja
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className="material-symbols-outlined text-secondary-container text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {monthDelta !== null && monthDelta < 0
                  ? "trending_down"
                  : "trending_up"}
              </span>
              <span className="font-heading text-2xl font-bold text-primary-container tracking-tight">
                {monthDelta !== null
                  ? `${monthDelta >= 0 ? "+" : ""}${monthDelta}%`
                  : scores.length === 1
                    ? scores[0].overall_score
                    : "--"}
              </span>
            </div>
            <span className="text-xs text-text-secondary mt-1">
              {scores.length >= 2
                ? "Bulan ini"
                : scores.length === 1
                  ? "Skor terakhir Anda"
                  : "Mulai rekam untuk melihat progres"}
            </span>
          </div>
          <div className="w-24 h-12 flex items-center justify-end">
            <svg
              className="w-28 h-14 overflow-visible"
              viewBox="0 0 100 40"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00A2FD" />
                  <stop offset="100%" stopColor="#00E5FF" />
                </linearGradient>
              </defs>
              <path
                d={sparkPath ?? "M0 30 Q 25 30, 40 20 T 80 15 T 100 5"}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity={sparkPath ? 1 : 0.3}
              />
              {sparkPath && (
                <circle
                  cx="100"
                  cy={sparkY(spark[spark.length - 1])}
                  r="4"
                  fill="#00E5FF"
                />
              )}
            </svg>
          </div>
        </Link>
      </main>
    </div>
  );
}
