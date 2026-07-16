import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/profile/SignOutButton";
import { InstallPwa } from "@/components/pwa/InstallPwa";
import { SubscribeMenuItem } from "@/components/payment/SubscribeMenuItem";

export const dynamic = "force-dynamic";

function speakingLevel(avg: number | null): string {
  if (avg === null) return "Pemula";
  if (avg >= 85) return "Advanced Pro";
  if (avg >= 70) return "Intermediate Pro";
  if (avg >= 50) return "Rising Speaker";
  return "Pemula";
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);

  const [{ data: profile }, { data: recordings }, { data: scores }, { count: moduleCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url, occupation, subscription_tier, subscription_renews_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("recordings")
        .select("created_at, duration_seconds, module_id")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("score_history")
        .select("overall_score")
        .order("recorded_at", { ascending: false })
        .limit(50),
      supabase
        .from("practice_modules")
        .select("id", { count: "exact", head: true }),
    ]);

  const name = profile?.full_name ?? user.email?.split("@")[0] ?? "Speaker";
  const rows = recordings ?? [];

  // Consecutive-day streak, counting back from today (or yesterday).
  const daysWithPractice = new Set(rows.map((r) => dayKey(new Date(r.created_at))));
  let streak = 0;
  const cursor = new Date();
  if (!daysWithPractice.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (daysWithPractice.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const totalMinutes = Math.round(
    rows.reduce((a, r) => a + (r.duration_seconds ?? 0), 0) / 60,
  );

  const allScores = scores ?? [];
  const avgScore = allScores.length
    ? Math.round(
        allScores.reduce((a, s) => a + s.overall_score, 0) / allScores.length,
      )
    : null;

  const weekDays = new Set(
    rows
      .filter((r) => new Date(r.created_at) >= weekStart)
      .map((r) => (new Date(r.created_at).getDay() + 6) % 7),
  );
  const weeklyGoal = Math.round((weekDays.size / 7) * 100);

  const modulesTried = new Set(rows.map((r) => r.module_id).filter(Boolean)).size;
  const totalModules = moduleCount ?? 4;
  const moduleRatio = totalModules ? modulesTried / totalModules : 0;
  const ringCircumference = 2 * Math.PI * 34;

  const isPro = profile?.subscription_tier === "premium";
  const renews = profile?.subscription_renews_at
    ? new Date(profile.subscription_renews_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const stats = [
    {
      icon: "local_fire_department",
      value: String(streak),
      label: "Hari Beruntun",
      tone: "cyan",
    },
    {
      icon: "schedule",
      value: String(totalMinutes),
      label: "Menit Latihan",
      tone: "aqua",
    },
    {
      icon: "star",
      value: avgScore !== null ? String(avgScore) : "--",
      label: "Skor Rata-rata",
      tone: "cyan",
    },
    {
      icon: "trending_up",
      value: `${weeklyGoal}%`,
      label: "Target Mingguan",
      tone: "aqua",
    },
  ];

  const menu = [
    {
      href: "/history",
      icon: "history",
      title: "Riwayat Latihan",
      subtitle: `${rows.length} sesi tercatat`,
      toneAqua: false,
    },
    {
      href: "/settings",
      icon: "manage_accounts",
      title: "Account Settings",
      subtitle: "Notifikasi, Privasi & Keamanan",
      toneAqua: false,
    },
    {
      href: "/pro-shop",
      icon: "shopping_bag",
      title: "Pro Shop",
      subtitle: "Eksklusif Member",
      toneAqua: false,
    },
    {
      href: "/help",
      icon: "help",
      title: "Bantuan & Dukungan",
      subtitle: "FAQ, Panduan, Support & Lapor",
      toneAqua: true,
    },
  ];

  return (
    <div className="w-full max-w-md mx-auto relative">
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-margin-mobile py-4 w-full max-w-md mx-auto">
          <span className="font-headline-md text-headline-md-mobile text-headline-md text-primary font-bold">
            Profile
          </span>
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center hover:opacity-80 active:scale-95 transition text-on-surface-variant"
            aria-label="Notifikasi"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
        </div>
      </header>

      <main className="pt-[88px] px-margin-mobile flex flex-col gap-bento-gap stagger">
        {/* Profile header */}
        <section className="bg-surface-card rounded-3xl shadow-soft flex flex-col items-center text-center relative overflow-hidden p-4 pb-6">
          <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-secondary-container/10 to-transparent" />
          <div className="relative w-24 h-24 rounded-full border-4 border-surface-card bg-secondary-container mb-4 overflow-hidden shadow-lg mt-4 flex items-center justify-center">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-heading text-headline-md font-bold text-on-secondary">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-1 font-bold">
            {name}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-3">
            {user.email}
          </p>
          <div className="bg-primary-container text-on-primary rounded-full px-4 py-1.5 flex items-center gap-2 font-label-sm text-label-sm shadow-md">
            <span className="material-symbols-outlined text-[16px] text-light-aqua">
              military_tech
            </span>
            Speaking Level: {speakingLevel(avgScore)}
          </div>
          <div
            className={
              isPro
                ? "mt-2 rounded-full px-4 py-1.5 flex items-center gap-1.5 font-label-sm text-label-sm bg-tertiary-fixed-dim/20 text-on-tertiary-container border border-tertiary-fixed-dim/30"
                : "mt-2 rounded-full px-4 py-1.5 flex items-center gap-1.5 font-label-sm text-label-sm bg-surface-container text-on-surface-variant border border-stroke-subtle"
            }
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {isPro ? "verified" : "lock"}
            </span>
            {isPro
              ? `Berlangganan Premium${renews ? ` • s.d. ${renews}` : ""}`
              : "Belum Berlangganan"}
          </div>
        </section>

        {/* Stats grid */}
        <h2 className="font-title-lg text-title-lg text-primary px-2 mt-2">
          Statistik Latihan
        </h2>
        <div className="grid grid-cols-2 gap-bento-gap">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-surface-card rounded-3xl border border-stroke-subtle shadow-sm flex flex-col justify-between aspect-square p-4 transition-all hover:shadow-md"
            >
              <div
                className={
                  s.tone === "cyan"
                    ? "w-10 h-10 rounded-full bg-secondary-container/10 flex items-center justify-center text-secondary-container mb-2"
                    : "w-10 h-10 rounded-full bg-tertiary-fixed-dim/10 flex items-center justify-center text-on-tertiary-container mb-2"
                }
              >
                <span className="material-symbols-outlined text-[20px]">
                  {s.icon}
                </span>
              </div>
              <div>
                <p className="font-headline-md text-headline-md text-primary">
                  {s.value}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">
                  {s.label}
                </p>
              </div>
            </div>
          ))}

          {/* Modules completed */}
          <div className="col-span-2 bg-primary-container text-on-primary rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center justify-between relative overflow-hidden p-4">
            <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />
            <div className="flex items-center gap-6 relative z-10">
              <div className="relative flex items-center justify-center">
                <svg className="w-20 h-20 -rotate-90">
                  <circle
                    className="text-white/10"
                    cx="40"
                    cy="40"
                    fill="transparent"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="8"
                  />
                  <circle
                    className="text-light-aqua"
                    cx="40"
                    cy="40"
                    fill="transparent"
                    r="34"
                    stroke="currentColor"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringCircumference * (1 - moduleRatio)}
                    strokeLinecap="round"
                    strokeWidth="8"
                  />
                </svg>
                <span className="absolute font-headline-md text-headline-md text-on-primary">
                  {modulesTried}
                </span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-title-lg text-title-lg text-on-primary">
                  Modul Dijelajahi
                </h3>
                <p className="font-body-md text-inverse-primary text-sm">
                  {Math.round(moduleRatio * 100)}% dari {totalModules} modul
                  latihan
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <section className="bg-surface-card rounded-3xl shadow-soft mt-2 overflow-hidden">
          <ul className="divide-y divide-surface-container">
            {menu.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="w-full px-6 flex items-center justify-between hover:bg-surface-container-lowest transition-colors group py-3"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={
                        item.toneAqua
                          ? "w-8 h-8 rounded-full bg-tertiary-fixed-dim/10 flex items-center justify-center text-on-tertiary-container"
                          : "w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant group-hover:text-secondary-container transition-colors"
                      }
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {item.icon}
                      </span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-label-md text-label-md text-primary">
                        {item.title}
                      </span>
                      <span className="font-label-sm text-label-sm text-secondary-container">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">
                    chevron_right
                  </span>
                </Link>
              </li>
            ))}
            <SubscribeMenuItem isPro={isPro} renewsLabel={renews} />
            <InstallPwa />
          </ul>
        </section>

        {/* Logout */}
        <div className="pt-2">
          <SignOutButton variant="outline" />
        </div>
      </main>
    </div>
  );
}
