"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { usePitch } from "@/components/recording/usePitch";
import { cn } from "@/lib/utils";

const SESSION_MINUTES = 8;

function badgeFor(variation: number, voicedRatio: number): string {
  if (voicedRatio < 0.15) return "Mulai Bicara";
  if (variation < 15) return "Terlalu Monoton";
  if (variation < 30) return "Terus Variasikan";
  if (variation < 60) return "Variasi Bagus";
  return "Energi Luar Biasa";
}

export default function DynamicPitchPage() {
  const router = useRouter();
  const pitch = usePitch();
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!pitch.active) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [pitch.active]);

  const voiced = pitch.history.filter((v) => !Number.isNaN(v));
  const voicedRatio = voiced.length / pitch.history.length;
  const badge = badgeFor(pitch.variation, voicedRatio);

  // Map the rolling pitch history to an SVG polyline (0..320 x 0..128).
  const userPath = useMemo(() => {
    const pts: string[] = [];
    const n = pitch.history.length;
    pitch.history.forEach((hz, i) => {
      if (Number.isNaN(hz)) return;
      const x = (i / (n - 1)) * 320;
      const y =
        128 - ((hz - pitch.minHz) / (pitch.maxHz - pitch.minHz)) * 118 - 5;
      pts.push(`${pts.length === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
    });
    return pts.join(" ");
  }, [pitch.history, pitch.minHz, pitch.maxHz]);

  const progress = Math.min(100, Math.round((elapsed / (SESSION_MINUTES * 60)) * 100));

  async function finishSession() {
    pitch.stop();
    setSaving(true);
    try {
      await fetch("/api/drills/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSlug: "dynamic-pitch",
          durationSeconds: elapsed,
        }),
      });
    } finally {
      setSaving(false);
      setFinished(true);
    }
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopAppBar variant="back" title="Dynamic Pitch" />
        <main className="flex-1 flex flex-col items-center justify-center px-margin-mobile gap-6 text-center">
          <div className="w-24 h-24 rounded-full bg-secondary-container/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary-container text-[48px]">
              graphic_eq
            </span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              Sesi Intonasi Selesai!
            </h2>
            <p className="text-body-md text-text-secondary mt-2 max-w-xs">
              Variasi pitch terakhir Anda: ±{pitch.variation} Hz. Semakin
              dinamis intonasi, semakin hidup pesan Anda.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => router.push("/record")}
              className="w-full bg-secondary-container text-on-secondary rounded-full py-3.5 font-semibold shadow-md active:scale-95 transition"
            >
              Lanjut Rekaman Penuh
            </button>
            <button
              type="button"
              onClick={() => router.push("/library")}
              className="w-full border border-outline-variant text-on-surface rounded-full py-3.5 font-semibold active:scale-95 transition"
            >
              Kembali ke Library
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopAppBar variant="back" title="Dynamic Pitch" />
      <main className="pt-24 px-margin-mobile space-y-gutter max-w-2xl mx-auto">
        {/* Live pitch visualizer */}
        <div
          className="rounded-3xl p-6 relative overflow-hidden shadow-2xl min-h-[280px] flex flex-col justify-between"
          style={{
            background:
              "linear-gradient(145deg, #0d1c32 0%, #003558 100%)",
          }}
        >
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <span className="font-label-sm text-label-sm text-secondary-container uppercase tracking-wider">
                Live Vocal Range
              </span>
              <h3 className="font-title-lg text-title-lg text-white mt-1">
                Analisis Real-time
              </h3>
            </div>
            {pitch.active && (
              <div className="px-3 py-1 rounded-full bg-secondary-container/20 border border-secondary-container/30 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                <span className="font-label-sm text-label-sm text-secondary-container">
                  LIVE
                </span>
              </div>
            )}
          </div>

          <div className="relative h-32 w-full mt-4 flex items-end">
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 320 128"
              preserveAspectRatio="none"
            >
              {/* Target pitch band */}
              <path
                d="M 0 60 Q 50 20, 100 80 T 200 40 T 300 90 T 400 30"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeDasharray="4 4"
                strokeWidth="2"
              />
              {userPath && (
                <path
                  className="drop-shadow-[0_0_8px_rgba(0,162,253,0.8)]"
                  d={userPath}
                  fill="none"
                  stroke="#00a2fd"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              )}
            </svg>
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-2 pointer-events-none">
              <span className="text-[10px] text-white/40 font-bold">HIGH</span>
              <span className="text-[10px] text-white/40 font-bold">MID</span>
              <span className="text-[10px] text-white/40 font-bold">LOW</span>
            </div>
          </div>

          <div className="relative z-10 flex justify-between items-center mt-4">
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/50">PITCH</span>
                <span className="text-white font-bold">
                  {pitch.currentHz ? `${pitch.currentHz} Hz` : "--"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-white/50">VARIASI</span>
                <span className="text-white font-bold">
                  {pitch.variation < 15
                    ? "RENDAH"
                    : pitch.variation < 40
                      ? "SEDANG"
                      : "TINGGI"}
                </span>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-white text-primary-container font-bold text-label-md shadow-lg transition-all">
              {pitch.active ? badge : "Siap Mulai"}
            </div>
          </div>
        </div>

        {/* Practice script */}
        <div className="bg-surface-card rounded-3xl p-6 shadow-sm border border-stroke-subtle">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-secondary text-lg">
              description
            </span>
            <h4 className="font-title-lg text-title-lg text-on-surface">
              Naskah Latihan
            </h4>
          </div>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
            Untuk memberikan{" "}
            <span className="inline-block px-2 py-0.5 rounded-lg bg-secondary-container/10 text-secondary-container font-extrabold border border-secondary-container/20">
              DAMPAK
              <span className="material-symbols-outlined text-[14px] ml-1 align-middle">
                trending_up
              </span>
            </span>{" "}
            yang bertahan lama, suara Anda harus membawa{" "}
            <span className="inline-block px-2 py-0.5 rounded-lg bg-secondary-container/10 text-secondary-container font-extrabold border border-secondary-container/20">
              EMOSI
              <span className="material-symbols-outlined text-[14px] ml-1 align-middle">
                trending_up
              </span>
            </span>{" "}
            yang tulus. Bukan sekadar kata-kata, tetapi{" "}
            <span className="italic text-secondary">intonasi</span> di
            baliknya.
          </p>
          <div className="flex flex-wrap gap-2 pt-4">
            <span className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-label-sm font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">
                info
              </span>
              Naikkan nada di kata yang disorot
            </span>
          </div>
        </div>

        {pitch.error && (
          <p
            role="alert"
            className="rounded-2xl bg-error-container text-on-error-container px-4 py-3 text-label-md font-label-md"
          >
            {pitch.error}
          </p>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 bg-surface-card p-4 rounded-3xl shadow-sm border border-stroke-subtle">
          {pitch.active ? (
            <>
              <button
                type="button"
                onClick={() => {
                  pitch.stop();
                  setElapsed(0);
                }}
                className="flex flex-col items-center gap-1 text-secondary-container/60 hover:text-secondary-container transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">
                  replay
                </span>
                <span className="text-[10px] font-bold uppercase">Ulangi</span>
              </button>
              <button
                type="button"
                onClick={finishSession}
                disabled={saving}
                className="w-16 h-16 rounded-full bg-error flex items-center justify-center shadow-lg shadow-error/30 active:scale-95 transition-transform disabled:opacity-60"
                aria-label="Selesai"
              >
                <span className="material-symbols-outlined text-white text-3xl">
                  stop
                </span>
              </button>
              <div className="flex flex-col items-center gap-1 text-secondary-container">
                <span className="text-2xl font-bold tabular-nums">
                  {Math.floor(elapsed / 60)}:
                  {(elapsed % 60).toString().padStart(2, "0")}
                </span>
                <span className="text-[10px] font-bold uppercase">Durasi</span>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={pitch.start}
              className="flex-1 h-14 rounded-full bg-secondary-container text-on-secondary font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mic
              </span>
              Mulai Latihan Pitch
            </button>
          )}
        </div>

        {/* Session progress */}
        <div className="bg-primary-container rounded-3xl p-5 flex items-center justify-between border border-white/10 shadow-xl">
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
              Progres Sesi
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-secondary-container shadow-[0_0_10px_rgba(0,162,253,0.5)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white font-bold text-label-sm">
                {progress}%
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">
              Target Pitch
            </span>
            <span className="text-secondary-container font-bold text-label-md">
              180 - 260 Hz
            </span>
          </div>
        </div>

        {/* Pro tip */}
        <div className="bg-secondary-fixed/30 rounded-3xl p-6 flex items-start gap-4 border border-secondary-fixed/50">
          <div className="bg-white rounded-2xl p-3 shadow-sm">
            <span className="material-symbols-outlined text-secondary">
              tips_and_updates
            </span>
          </div>
          <div>
            <h5 className="font-label-md text-label-md text-on-secondary-fixed-variant">
              Pro Tip
            </h5>
            <p className="text-label-sm text-on-secondary-fixed-variant opacity-80 mt-1">
              Coba turunkan nada di akhir kalimat agar terdengar lebih
              berwibawa.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
