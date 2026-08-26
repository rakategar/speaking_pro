import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { participantDetail } from "@/lib/client/analytics";
import { forecastScores, riskFlags } from "@/lib/client/forecast";
import { speakingLevel } from "@/lib/format";
import { PeriodPicker } from "@/components/client/PeriodPicker";
import { Stat } from "@/components/client/Stat";
import { ActivityBars } from "@/components/client/ActivityBars";

export const dynamic = "force-dynamic";

const ALLOWED_DAYS = [7, 30, 90];
const FORECAST_HORIZON_DAYS = 30;

function readDays(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return ALLOWED_DAYS.includes(n) ? n : 30;
}

const round1 = (v: number | null) =>
  v == null ? "–" : (Math.round(v * 10) / 10).toLocaleString("id-ID");

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const mmss = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
};

export default async function ParticipantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const { id } = await params;
  const days = readDays((await searchParams).days);

  // Returns null for anyone outside this organization, so a guessed uuid in
  // the URL is a 404 rather than another client's participant.
  const detail = await participantDetail(session.orgId, id, days);
  if (!detail) notFound();

  const { row, points, averages: avg, previousAverages: prev, daily } = detail;
  const forecast = forecastScores(points, FORECAST_HORIZON_DAYS);
  const flags = riskFlags(row, forecast);
  const scored = points.filter((p) => !p.isDrill);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/client/participants?days=${days}`}
            className="text-sm font-semibold text-text-secondary hover:text-primary"
          >
            ← Kembali ke daftar peserta
          </Link>
          <h1 className="mt-1 text-2xl font-extrabold text-primary">
            {row.name ?? "(tanpa nama)"}
          </h1>
          <p className="text-sm text-text-secondary">{row.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodPicker days={days} />
          <a
            href={`/api/client/reports?days=${days}&userId=${row.userId}`}
            className="rounded-full border border-stroke-subtle bg-surface-card px-4 py-2 text-sm font-semibold text-primary shadow-soft"
          >
            Unduh PDF
          </a>
        </div>
      </div>

      {flags.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Perlu perhatian</p>
          <p className="mt-1 text-sm text-amber-700">{flags.join(" · ")}</p>
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Sesi" value={row.sessions} hint={`+ ${row.drills} drill`} />
        <Stat label="Menit" value={row.minutes} hint="durasi latihan" />
        <Stat
          label="Skor rata-rata"
          value={round1(row.avgOverall)}
          hint={row.avgOverall != null ? speakingLevel(row.avgOverall) : "belum ada sesi"}
        />
        <Stat
          label="Proyeksi 30 hari"
          value={round1(forecast.projected)}
          hint={
            forecast.projected == null
              ? `data belum cukup (${forecast.points} sesi)`
              : `keyakinan ${forecast.confidence}`
          }
        />
      </section>

      <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          Aktivitas Harian
        </h2>
        <div className="mt-4">
          <ActivityBars daily={daily} />
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
            ].map((m) => {
              const diff =
                m.v != null && m.p != null ? Math.round((m.v - m.p) * 10) / 10 : null;
              return (
                <div key={m.label}>
                  <p className="text-xs text-text-secondary">{m.label}</p>
                  <p className="text-xl font-extrabold text-primary">{round1(m.v)}</p>
                  <p className="text-xs text-text-secondary">
                    {diff == null
                      ? "belum ada pembanding"
                      : diff === 0
                        ? "tidak berubah"
                        : `${diff > 0 ? "+" : ""}${round1(diff)} vs sebelumnya`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
          Riwayat Sesi ({scored.length})
        </h2>
        {/* Module, duration and scores only. What the participant actually
            said is their own data and is never shown to their organization. */}
        {scored.length === 0 ? (
          <p className="mt-3 text-sm text-text-secondary">
            Belum ada sesi bernilai pada periode ini.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-stroke-subtle text-left text-xs uppercase tracking-wider text-text-secondary">
                  <th className="p-2">Waktu</th>
                  <th className="p-2">Modul</th>
                  <th className="p-2">Durasi</th>
                  <th className="p-2">Overall</th>
                  <th className="p-2">Kejelasan</th>
                  <th className="p-2">Percaya diri</th>
                  <th className="p-2">WPM</th>
                </tr>
              </thead>
              <tbody>
                {[...scored].reverse().map((s) => (
                  <tr key={s.id} className="border-b border-stroke-subtle/60">
                    <td className="p-2 text-text-secondary">{fmtDateTime(s.createdAt)}</td>
                    <td className="p-2">{s.moduleTitle ?? "Rekaman bebas"}</td>
                    <td className="p-2">{mmss(s.durationSeconds)}</td>
                    <td className="p-2 font-semibold">{round1(s.overall)}</td>
                    <td className="p-2">{round1(s.clarity)}</td>
                    <td className="p-2">{round1(s.confidence)}</td>
                    <td className="p-2">{round1(s.wpm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
