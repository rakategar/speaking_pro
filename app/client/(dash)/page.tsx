import Link from "next/link";
import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { analyseCohort } from "@/lib/client/insights";
import { speakingLevel } from "@/lib/format";
import { readPeriodFromParams } from "@/lib/client/period";
import { PeriodPicker } from "@/components/client/PeriodPicker";
import { PeriodError } from "@/components/client/PeriodError";
import { AutoRefresh } from "@/components/client/AutoRefresh";
import { Stat } from "@/components/client/Stat";
import { ActivityBars } from "@/components/client/ActivityBars";

export const dynamic = "force-dynamic";

const round1 = (v: number | null) =>
  v == null ? "–" : (Math.round(v * 10) / 10).toLocaleString("id-ID");

function Delta({ value, previous }: { value: number | null; previous: number | null }) {
  if (value == null || previous == null) {
    return <span className="text-text-secondary">belum ada pembanding</span>;
  }
  const diff = Math.round((value - previous) * 10) / 10;
  if (diff === 0) return <span className="text-text-secondary">tidak berubah</span>;
  return (
    <span className={diff > 0 ? "text-emerald-600" : "text-red-500"}>
      {diff > 0 ? "▲ +" : "▼ "}
      {round1(Math.abs(diff))} vs periode sebelumnya
    </span>
  );
}

export default async function ClientOverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const { period, error: periodError } = readPeriodFromParams(await searchParams);
  const { overview, risky, forecast } = await analyseCohort(session.orgId, period);
  const avg = overview.averages;
  const prev = overview.previousAverages;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Ringkasan Program</h1>
          <p className="text-sm text-text-secondary">
            Perkembangan {overview.participants} peserta selama periode {period.label}.
          </p>
        </div>
        <PeriodPicker period={period} />
      </div>

      <PeriodError message={periodError} />
      <AutoRefresh renderedAt={new Date().toISOString()} />

      {overview.participants === 0 ? (
        <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-8 text-center shadow-soft">
          <p className="font-semibold text-primary">Belum ada peserta terdaftar</p>
          <p className="mt-1 text-sm text-text-secondary">
            Peserta muncul di sini setelah tim Speaking Pro menautkan akun mereka
            ke organisasi Anda.
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              label="Peserta aktif"
              value={`${overview.activeParticipants}/${overview.participants}`}
              hint="ada latihan pada periode ini"
              tone={overview.activeParticipants === 0 ? "warn" : "default"}
            />
            <Stat label="Total sesi" value={overview.sessions} hint={`+ ${overview.drills} drill`} />
            <Stat label="Total menit" value={overview.minutes} hint="durasi latihan" />
            <Stat
              label="Skor rata-rata"
              value={round1(avg?.overall ?? null)}
              hint={avg?.overall != null ? speakingLevel(avg.overall) : "belum ada sesi bernilai"}
            />
          </section>

          <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
              Aktivitas Harian
            </h2>
            <div className="mt-4">
              <ActivityBars daily={overview.daily} />
            </div>
          </section>

          {avg ? (
            <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
                Rata-rata per Metrik
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: "Keseluruhan", v: avg.overall, p: prev?.overall ?? null },
                  { label: "Kejelasan", v: avg.clarity, p: prev?.clarity ?? null },
                  { label: "Kepercayaan diri", v: avg.confidence, p: prev?.confidence ?? null },
                  { label: "Struktur", v: avg.structure, p: prev?.structure ?? null },
                  { label: "Intonasi", v: avg.intonation, p: prev?.intonation ?? null },
                  { label: "Kecepatan (WPM)", v: avg.wpm, p: prev?.wpm ?? null },
                  { label: "Kata pengisi", v: avg.fillerWordCount, p: prev?.fillerWordCount ?? null },
                ].map((m) => (
                  <div key={m.label}>
                    <p className="text-xs text-text-secondary">{m.label}</p>
                    <p className="text-xl font-extrabold text-primary">{round1(m.v)}</p>
                    <p className="text-xs">
                      <Delta value={m.v} previous={m.p} />
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
              Proyeksi {forecast.horizonDays} Hari
            </h2>
            {forecast.projected == null ? (
              <p className="mt-3 text-sm text-text-secondary">
                Data belum cukup untuk proyeksi yang bisa dipertanggungjawabkan
                (baru {forecast.points} sesi bernilai, minimal 4).
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-baseline gap-4">
                <p className="text-3xl font-extrabold text-primary">
                  {round1(forecast.projected)}
                </p>
                <p className="text-sm text-text-secondary">
                  dari {round1(forecast.current)} sekarang ·{" "}
                  {forecast.slopePerWeek > 0 ? "+" : ""}
                  {round1(forecast.slopePerWeek)} poin/minggu · keyakinan{" "}
                  <span className="font-semibold">{forecast.confidence}</span>
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
                Perlu Perhatian ({risky.length})
              </h2>
              <Link
                href="/client/participants"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Lihat semua peserta →
              </Link>
            </div>
            {risky.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                Semua peserta aktif dan tidak ada yang tertinggal. 
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-stroke-subtle">
                {risky.slice(0, 8).map((r) => (
                  <li key={r.row.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <Link
                      href={`/client/participants/${r.row.userId}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {r.row.name ?? r.row.email}
                    </Link>
                    <span className="text-xs text-text-secondary">
                      {r.flags.join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
