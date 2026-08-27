import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { analyseProgress } from "@/lib/progress/analytics";
import { speakingLevel } from "@/lib/format";
import { MODULE_META } from "@/lib/modules";
import { fallbackReason } from "@/lib/mentor/plan";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { TrendChart } from "@/components/report/TrendChart";
import { BlurredPremiumSection } from "@/components/report/BlurredPremiumSection";
import { FaisalAvatar, type FaisalExpression } from "@/components/ui/FaisalAvatar";
import { MetricBars } from "@/components/progress/MetricBars";
import { MonthlyBars } from "@/components/progress/MonthlyBars";

export const dynamic = "force-dynamic";

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const num = (v: number | null) =>
  v === null ? "--" : (Math.round(v * 10) / 10).toLocaleString("id-ID");

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="rounded-3xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
      <span className="material-symbols-outlined text-[20px] text-secondary-container">
        {icon}
      </span>
      <p className="font-heading mt-1 text-2xl font-bold tabular-nums text-primary-container">
        {value}
      </p>
      <p className="font-label-sm text-label-sm text-text-secondary">{label}</p>
    </div>
  );
}

export default async function ProgressPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, analysis] = await Promise.all([
    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle(),
    analyseProgress(supabase, user.id),
  ]);
  const isPremium = profile?.subscription_tier === "premium";

  const {
    hasData,
    firstSessionAt,
    lastSessionAt,
    totalSessions,
    totalDrills,
    totalMinutes,
    activeDays,
    bestStreakDays,
    overallFirst,
    overallLatest,
    overallBest,
    metricTrends,
    byCategory,
    monthly,
    scoredPoints,
    forecast,
    strengths,
    weaknesses,
    recommendations,
  } = analysis;

  const growth =
    overallFirst !== null && overallLatest !== null ? overallLatest - overallFirst : null;

  const expression: FaisalExpression =
    overallLatest === null
      ? "inviting-mic"
      : growth !== null && growth > 0
        ? "celebrating"
        : overallLatest >= 70
          ? "approve-mic"
          : "tip-mic";

  if (!hasData) {
    return (
      <div className="min-h-screen bg-background">
        <TopAppBar variant="back" title="Analisis Menyeluruh" />
        <main className="mx-auto max-w-3xl px-margin-mobile pb-16 pt-32">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-stroke-subtle bg-surface-card p-8 text-center shadow-soft">
            <FaisalAvatar expression="inviting-mic" size={96} />
            <h1 className="font-title-lg text-title-lg text-primary">
              Perjalanan Anda belum dimulai
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Halaman ini merangkum seluruh latihan Anda dari sesi pertama sampai
              terakhir. Selesaikan satu rekaman analisis dan grafiknya mulai
              terisi.
            </p>
            <Link
              href="/record"
              className="mt-2 flex items-center gap-2 rounded-full bg-brand-cyan px-6 py-3 font-label-md text-label-md text-white shadow-[0_4px_14px_rgba(0,163,255,0.39)]"
            >
              <span className="material-symbols-outlined text-[18px]">mic</span>
              Rekam Sekarang
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopAppBar variant="back" title="Analisis Menyeluruh" />
      <main className="stagger mx-auto max-w-3xl space-y-bento-gap px-margin-mobile pb-16 pt-32">
        <div className="py-2">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">
            Perjalanan Latihan Anda
          </h1>
          <p className="mt-1 font-body-md text-body-md text-text-secondary">
            {firstSessionAt && lastSessionAt
              ? `${dateLabel(firstSessionAt)} — ${dateLabel(lastSessionAt)}`
              : "Seluruh riwayat latihan Anda."}
          </p>
        </div>

        {/* 1. The journey, in one number */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-primary p-6 shadow-soft">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-cyan/20 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-label-md text-label-md uppercase tracking-wider text-brand-aqua">
                Skor Pertama → Terakhir
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display-lg text-display-lg text-white/50">
                  {overallFirst ?? "--"}
                </span>
                <span className="material-symbols-outlined text-[22px] text-brand-aqua">
                  arrow_forward
                </span>
                <span className="font-display-lg text-display-lg text-white">
                  {overallLatest ?? "--"}
                </span>
              </div>
              {growth !== null && (
                <p className="mt-2 flex items-center gap-1 font-label-sm text-label-sm text-white/80">
                  <span
                    className={`material-symbols-outlined text-[16px] ${growth >= 0 ? "text-brand-aqua" : "text-error-container"}`}
                  >
                    {growth >= 0 ? "trending_up" : "trending_down"}
                  </span>
                  {growth >= 0 ? "+" : ""}
                  {growth} poin sejak sesi pertama
                </p>
              )}
              <p className="mt-1 font-label-sm text-label-sm text-white/70">
                Level: {speakingLevel(overallLatest)}
                {overallBest !== null && ` · Terbaik ${overallBest}`}
              </p>
            </div>
            <FaisalAvatar expression={expression} size={72} className="shrink-0" />
          </div>
        </section>

        {/* 2. Volume of practice */}
        <section className="grid grid-cols-2 gap-bento-gap">
          <Stat icon="mic" value={String(totalSessions)} label="Sesi analisis" />
          <Stat icon="fitness_center" value={String(totalDrills)} label="Drill selesai" />
          <Stat icon="schedule" value={String(totalMinutes)} label="Menit latihan" />
          <Stat
            icon="local_fire_department"
            value={`${activeDays}`}
            label={`Hari aktif · runtun ${bestStreakDays}`}
          />
        </section>

        {/* 3. Lifetime score trend */}
        {scoredPoints.length >= 2 && (
          <section className="rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
            <h2 className="mb-6 font-title-lg text-title-lg text-primary">
              Tren Skor Seumur Waktu
            </h2>
            <TrendChart
              labels={scoredPoints.map((p) =>
                new Date(p.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                }),
              )}
              scores={scoredPoints.map((p) => p.overall as number)}
            />
          </section>
        )}

        <BlurredPremiumSection active={!isPremium}>
          <div className="space-y-bento-gap">
            {/* 4. Every metric: lifetime vs lately */}
            <section className="rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
              <h2 className="font-title-lg text-title-lg text-primary">
                Rincian Per Metrik
              </h2>
              <p className="mb-5 mt-1 font-label-sm text-label-sm text-text-secondary">
                Bar terang = rata-rata 5 sesi terakhir. Bar gelap = rata-rata
                seluruh latihan Anda.
              </p>
              <MetricBars trends={metricTrends} />
            </section>

            {/* 5. Strengths & weaknesses */}
            {(strengths.length > 0 || weaknesses.length > 0) && (
              <section className="grid gap-bento-gap md:grid-cols-2">
                <div className="rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-green-500">
                      check_circle
                    </span>
                    <h3 className="font-title-md text-title-md text-primary">Kekuatan</h3>
                  </div>
                  {strengths.length === 0 ? (
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Belum ada metrik yang menonjol. Konsistensi dulu, keunggulan
                      menyusul.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {strengths.map((s, i) => (
                        <li
                          key={i}
                          className="font-body-md text-body-md leading-relaxed text-on-surface-variant"
                        >
                          • {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-orange-500">
                      error
                    </span>
                    <h3 className="font-title-md text-title-md text-primary">
                      Perlu Ditingkatkan
                    </h3>
                  </div>
                  {weaknesses.length === 0 ? (
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Tidak ada metrik yang berada di bawah ambang. Pertahankan.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {weaknesses.map((s, i) => (
                        <li
                          key={i}
                          className="font-body-md text-body-md leading-relaxed text-on-surface-variant"
                        >
                          • {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {/* 6. Which kinds of practice you actually do */}
            {byCategory.length > 0 && (
              <section className="rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
                <h2 className="mb-4 font-title-lg text-title-lg text-primary">
                  Performa Per Kategori
                </h2>
                <div className="flex flex-col gap-3">
                  {byCategory.map((c) => (
                    <div
                      key={c.category}
                      className="flex items-center gap-3 rounded-2xl border border-stroke-subtle bg-surface-container-low p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-primary">
                          {c.category}
                        </p>
                        <p className="font-label-sm text-label-sm text-text-secondary">
                          {c.sessions} latihan · {c.minutes} menit
                        </p>
                      </div>
                      <span className="font-title-lg text-title-lg tabular-nums text-brand-cyan">
                        {num(c.avgOverall)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Activity by month */}
            {monthly.length > 0 && (
              <section className="rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
                <h2 className="font-title-lg text-title-lg text-primary">
                  Aktivitas Bulanan
                </h2>
                <p className="mb-5 mt-1 font-label-sm text-label-sm text-text-secondary">
                  Tinggi bar = jumlah latihan. Angka di atas = rata-rata skor bulan
                  itu.
                </p>
                <MonthlyBars months={monthly} />
              </section>
            )}

            {/* 8. Projection -- always with its confidence attached */}
            <section className="rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
              <div className="mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-brand-cyan">
                  timeline
                </span>
                <h2 className="font-title-lg text-title-lg text-primary">
                  Proyeksi 30 Hari
                </h2>
              </div>
              {forecast.projected === null ? (
                <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                  Data belum cukup untuk memproyeksikan skor Anda
                  {forecast.points > 0 && ` (baru ${forecast.points} sesi bernilai)`}.
                  Perlu minimal 4 sesi analisis agar garis trennya bisa dipercaya.
                </p>
              ) : (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display-lg text-display-lg text-primary-container">
                      {num(forecast.projected)}
                    </span>
                    <span className="font-label-md text-label-md text-text-secondary">
                      dari {num(forecast.current)} sekarang
                    </span>
                  </div>
                  <p className="mt-2 font-body-md text-body-md text-on-surface-variant">
                    Tren Anda{" "}
                    {forecast.slopePerWeek >= 0 ? "naik" : "turun"}{" "}
                    {num(Math.abs(forecast.slopePerWeek))} poin per minggu.
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1 font-label-sm text-label-sm text-text-secondary">
                    <span className="material-symbols-outlined text-[14px]">
                      {forecast.confidence === "kuat"
                        ? "verified"
                        : forecast.confidence === "sedang"
                          ? "help"
                          : "warning"}
                    </span>
                    Keyakinan {forecast.confidence} · {forecast.points} sesi
                  </p>
                </>
              )}
            </section>

            {/* 10. Take it with you */}
            <a
              href="/api/progress/pdf"
              className="flex items-center justify-center gap-2 rounded-full bg-primary-container py-3.5 font-label-md text-label-md text-white shadow-soft"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Unduh Laporan PDF
            </a>
          </div>
        </BlurredPremiumSection>

        {/* 9. What to do about all of this */}
        <section className="rounded-3xl bg-primary-container p-6 shadow-soft">
          <h2 className="mb-1 font-title-lg text-title-lg text-white">
            Latihan Yang Tepat Untuk Anda
          </h2>
          <p className="mb-4 font-label-sm text-label-sm text-white/70">
            Dipilih dari angka di halaman ini.
          </p>
          <div className="flex flex-col gap-2">
            {recommendations.map((pick, i) => (
              <Link
                key={pick.slug}
                href={MODULE_META[pick.slug]?.route ?? `/library/${pick.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-light-aqua">
                  {MODULE_META[pick.slug]?.icon ?? "mic"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {i + 1}. {pick.category}
                  </p>
                  <p className="line-clamp-2 text-xs text-white/70">
                    {fallbackReason(pick)}
                  </p>
                </div>
                <span className="material-symbols-outlined text-white/50">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/library"
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-brand-cyan py-3 font-label-md text-label-md text-white"
          >
            Buka Mentor AI
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </section>

        <Link
          href="/history"
          className="flex items-center gap-3 rounded-3xl border border-stroke-subtle bg-surface-card p-4 shadow-soft"
        >
          <span className="material-symbols-outlined text-secondary-container">
            history
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary">Riwayat Latihan</p>
            <p className="text-xs text-text-secondary">
              Buka rapor lengkap tiap sesi satu per satu.
            </p>
          </div>
          <span className="material-symbols-outlined text-text-secondary">
            chevron_right
          </span>
        </Link>
      </main>
    </div>
  );
}
