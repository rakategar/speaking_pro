"use client";

import { useState } from "react";
import type { CohortNarrative } from "@/lib/gemini/cohort-narrative";
import type { Forecast } from "@/lib/client/forecast";
import { periodQuery, type Period } from "@/lib/client/period";

const round1 = (v: number | null) =>
  v == null ? "–" : (Math.round(v * 10) / 10).toLocaleString("id-ID");

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
      <h2 className="text-sm font-extrabold uppercase tracking-wider text-text-secondary">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function InsightsPanel({
  period,
  initialNarrative,
  initialGeneratedAt,
  forecast,
  hasData,
}: {
  period: Period;
  initialNarrative: CohortNarrative | null;
  initialGeneratedAt: string | null;
  forecast: Forecast;
  hasData: boolean;
}) {
  const [narrative, setNarrative] = useState(initialNarrative);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate(force: boolean) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/client/insights?${periodQuery(period)}${force ? "&force=1" : ""}`,
        { method: "POST" },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal membuat analisis");
        return;
      }
      if (json.narrative) setNarrative(json.narrative);
      if (json.generatedAt) setGeneratedAt(json.generatedAt);
      if (json.error) setError(json.error);
    } finally {
      setBusy(false);
    }
  }

  if (!hasData) {
    return (
      <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-8 text-center shadow-soft">
        <p className="font-semibold text-primary">Belum ada data untuk dianalisis</p>
        <p className="mt-1 text-sm text-text-secondary">
          Analisis muncul setelah peserta menyelesaikan setidaknya satu sesi
          latihan bernilai pada periode ini.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
        <p className="text-sm text-text-secondary">
          {generatedAt
            ? `Analisis terakhir dibuat ${new Date(generatedAt).toLocaleString("id-ID")}.`
            : "Analisis belum pernah dibuat untuk periode ini."}
        </p>
        <button
          onClick={() => generate(Boolean(narrative))}
          disabled={busy}
          className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Menyusun..." : narrative ? "Buat Ulang" : "Buat Analisis"}
        </button>
      </div>

      {error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {error}
        </p>
      ) : null}

      <Card title={`Proyeksi ${forecast.horizonDays} Hari`}>
        {forecast.projected == null ? (
          <p className="text-sm text-text-secondary">
            Data belum cukup untuk proyeksi ({forecast.points} sesi bernilai,
            minimal 4).
          </p>
        ) : (
          <p className="text-sm text-text-secondary">
            Skor rata-rata diproyeksikan menjadi{" "}
            <span className="text-lg font-extrabold text-primary">
              {round1(forecast.projected)}
            </span>{" "}
            dari {round1(forecast.current)} sekarang ({round1(forecast.slopePerWeek)}{" "}
            poin/minggu). Tingkat keyakinan{" "}
            <span className="font-semibold">{forecast.confidence}</span> (r² ={" "}
            {round1(forecast.r2)} dari {forecast.points} sesi). Angka ini adalah
            perpanjangan garis tren, bukan jaminan hasil.
          </p>
        )}
      </Card>

      {!narrative ? (
        <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-8 text-center shadow-soft">
          <p className="text-sm text-text-secondary">
            Tekan &ldquo;Buat Analisis&rdquo; untuk menyusun ringkasan naratif dan
            rekomendasi tindakan dari data di atas.
          </p>
        </div>
      ) : (
        <>
          {narrative.executive_summary.length > 0 ? (
            <Card title="Ringkasan Eksekutif">
              {narrative.executive_summary.map((p, i) => (
                <p key={i} className="mb-3 text-sm leading-relaxed text-on-surface">
                  {p}
                </p>
              ))}
            </Card>
          ) : null}

          {narrative.cohort_strengths.length > 0 ? (
            <Card title="Yang Sudah Berjalan Baik">
              <ul className="space-y-3">
                {narrative.cohort_strengths.map((s, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold text-primary">{s.title}</p>
                    <p className="text-sm text-text-secondary">{s.detail}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {narrative.cohort_risks.length > 0 ? (
            <Card title="Yang Perlu Diwaspadai">
              <ul className="space-y-3">
                {narrative.cohort_risks.map((s, i) => (
                  <li key={i}>
                    <p className="text-sm font-semibold text-primary">{s.title}</p>
                    <p className="text-sm text-text-secondary">{s.detail}</p>
                    {s.affected ? (
                      <p className="text-xs text-secondary-container">{s.affected}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {narrative.trend_reading || narrative.forecast_reading ? (
            <Card title="Pembacaan Tren">
              {narrative.trend_reading ? (
                <p className="mb-3 text-sm leading-relaxed">{narrative.trend_reading}</p>
              ) : null}
              {narrative.forecast_reading ? (
                <p className="text-sm leading-relaxed">{narrative.forecast_reading}</p>
              ) : null}
            </Card>
          ) : null}

          {narrative.trainer_actions.length > 0 ? (
            <Card title="Langkah Berikutnya">
              <ol className="space-y-3">
                {narrative.trainer_actions.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-primary">{a.action}</p>
                      <p className="text-sm text-text-secondary">{a.why}</p>
                      {a.who ? (
                        <p className="text-xs text-secondary-container">{a.who}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}

          {narrative.closing_note ? (
            <p className="px-2 text-sm italic text-text-secondary">
              {narrative.closing_note}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
