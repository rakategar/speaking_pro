"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { cn } from "@/lib/utils";

const CYCLE = 16; // 4s inhale + 4s hold + 8s exhale

function phaseFor(t: number): { label: string; remaining: number } {
  if (t < 4) return { label: "Tarik Napas", remaining: 4 - t };
  if (t < 8) return { label: "Tahan", remaining: 8 - t };
  return { label: "Hembuskan", remaining: 16 - t };
}

export default function BreathingControlPage() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const cycleTime = elapsed % CYCLE;
  const phase = phaseFor(cycleTime);
  const cycles = Math.floor(elapsed / CYCLE);
  // "Lung capacity" ramps with completed cycles toward 100% at 8 cycles.
  const capacity = Math.min(100, 40 + cycles * 8);

  async function finishSession() {
    setRunning(false);
    setSaving(true);
    try {
      await fetch("/api/drills/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSlug: "breathing-control",
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
        <TopAppBar variant="back" title="Breathing Control" />
        <main className="flex-1 flex flex-col items-center justify-center px-margin-mobile gap-6 text-center">
          <div className="w-24 h-24 rounded-full bg-secondary-container/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary-container text-[48px]">
              air
            </span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              Sesi Pernapasan Selesai!
            </h2>
            <p className="text-body-md text-text-secondary mt-2 max-w-xs">
              {cycles} siklus 4-4-8 tuntas. Napas yang terkontrol adalah
              fondasi suara yang stabil dan rasa tenang di atas panggung.
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
      <TopAppBar variant="back" title="Breathing Control" />
      <main className="pt-24 px-margin-mobile flex flex-col items-center max-w-lg mx-auto">
        {/* Breath indicator */}
        <div className="relative flex items-center justify-center w-full aspect-square mb-6 max-h-[360px]">
          <div className="absolute w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl" />
          <div className="absolute w-72 h-72 border border-secondary-container/10 rounded-full" />
          <div
            className={cn(
              "relative z-10 w-32 h-32 bg-[#00A3FF] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(0,163,255,0.4)]",
              running && "breath-indicator-animation",
            )}
            style={running ? undefined : { opacity: 0.3 }}
          >
            <div className="w-24 h-24 border-2 border-white/30 rounded-full" />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-title-lg text-title-lg text-secondary uppercase tracking-widest transition-all duration-500">
              {running ? phase.label : "Siap?"}
            </span>
            <span className="font-display-lg text-display-lg text-primary tabular-nums">
              {running ? phase.remaining : "4-4-8"}
            </span>
          </div>
        </div>

        {/* Routine card */}
        <div className="bg-white w-full rounded-3xl p-6 mb-bento-gap shadow-soft border border-stroke-subtle">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined">info</span>
              </div>
              <h2 className="font-title-lg text-title-lg text-primary">
                Rutinitas Harian
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Tarik", value: "4s", activeAt: "Tarik Napas" },
                { label: "Tahan", value: "4s", activeAt: "Tahan" },
                { label: "Hembus", value: "8s", activeAt: "Hembuskan" },
              ].map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    running && phase.label === s.activeAt
                      ? "bg-secondary-container/10 border-secondary-container/40"
                      : "bg-white/50 border-stroke-subtle",
                  )}
                >
                  <p className="font-label-sm text-label-sm text-text-secondary uppercase">
                    {s.label}
                  </p>
                  <p className="font-headline-md text-headline-md text-secondary">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-bento-gap w-full">
          <div className="glass-panel rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-secondary">
                vital_signs
              </span>
              <span className="font-label-md text-label-md text-secondary">
                {capacity}%
              </span>
            </div>
            <h3 className="font-label-sm text-label-sm text-text-secondary uppercase mb-2">
              Kapasitas Napas
            </h3>
            <div className="h-2 w-full bg-secondary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary-container rounded-full shadow-[0_0_10px_rgba(0,162,253,0.5)] transition-all"
                style={{ width: `${capacity}%` }}
              />
            </div>
          </div>
          <div className="glass-panel rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-secondary">
                timer
              </span>
              <span className="font-label-md text-label-md text-secondary">
                {cycles} siklus
              </span>
            </div>
            <h3 className="font-label-sm text-label-sm text-text-secondary uppercase mb-2">
              Sesi
            </h3>
            <p className="font-title-lg text-title-lg text-primary tabular-nums">
              {Math.floor(elapsed / 60)
                .toString()
                .padStart(2, "0")}
              :{(elapsed % 60).toString().padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Start / Finish */}
        <div className="mt-10 w-full flex justify-center pb-8">
          {running ? (
            <button
              type="button"
              onClick={finishSession}
              disabled={saving}
              className="bg-on-surface px-12 py-4 rounded-full text-white font-heading font-bold text-label-md flex items-center gap-2 shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                stop_circle
              </span>
              {saving ? "Menyimpan..." : "Selesaikan Sesi"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setElapsed(0);
                setRunning(true);
              }}
              className="bg-secondary-container px-12 py-4 rounded-full text-on-secondary font-heading font-bold text-label-md flex items-center gap-2 shadow-xl hover:opacity-90 active:scale-95 transition-all"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_circle
              </span>
              Mulai Sesi
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
