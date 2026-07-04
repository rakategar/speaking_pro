"use client";

import { useEffect, useRef, useState } from "react";
import type { DrillEngine } from "@/lib/drills/content";
import { cn } from "@/lib/utils";

type Metronome = Extract<DrillEngine, { kind: "metronome" }>;
type Countdown = Extract<DrillEngine, { kind: "countdown-affirmation" }>;
type Wizard = Extract<DrillEngine, { kind: "wizard" }>;

/* ── Visual metronome (one syllable per flash) ────────────────────────── */
export function MetronomeEngine({ engine }: { engine: Metronome }) {
  const [bpm, setBpm] = useState(engine.defaultBpm);
  const [running, setRunning] = useState(false);
  const [flash, setFlash] = useState(false);
  const flashOff = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!running) return;
    const beat = setInterval(() => {
      setFlash(true);
      flashOff.current = setTimeout(() => setFlash(false), 120);
    }, 60_000 / bpm);
    return () => {
      clearInterval(beat);
      if (flashOff.current) clearTimeout(flashOff.current);
      setFlash(false);
    };
  }, [running, bpm]);

  return (
    <div className="flex flex-col gap-bento-gap">
      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-8 flex flex-col items-center gap-6">
        <div
          className={cn(
            "w-40 h-40 rounded-[32px] border-2 flex items-center justify-center transition-all duration-100",
            flash
              ? "bg-[#00e5ff]/20 border-[#00e5ff] shadow-[0_0_40px_rgba(0,229,255,0.6)] scale-105"
              : "bg-surface-container-low border-stroke-subtle",
          )}
        >
          <span
            className={cn(
              "material-symbols-outlined text-[56px] transition-colors",
              flash ? "text-[#00b6d9]" : "text-outline-variant",
            )}
          >
            graphic_eq
          </span>
        </div>
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-text-secondary">
              Tempo
            </span>
            <span className="px-3 py-1 rounded-full bg-primary text-white text-label-md font-label-md font-bold">
              {bpm} BPM
            </span>
          </div>
          <input
            type="range"
            min={engine.minBpm}
            max={engine.maxBpm}
            step={5}
            value={bpm}
            onChange={(e) => setBpm(Number(e.target.value))}
            className="w-full accent-[#00a2fd]"
          />
        </div>
        <button
          type="button"
          onClick={() => setRunning(!running)}
          className={cn(
            "w-full py-3.5 rounded-2xl font-label-md text-label-md active:scale-95 transition",
            running
              ? "bg-surface-container-low text-on-surface-variant"
              : "bg-primary text-white",
          )}
        >
          {running ? "Hentikan Metronome" : "Mulai Metronome"}
        </button>
      </div>
      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6">
        <p className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider mb-3">
          Naskah Latihan — satu suku kata per kedipan
        </p>
        <p className="text-[19px] leading-[1.9] text-on-surface font-medium">
          {engine.script}
        </p>
      </div>
    </div>
  );
}

/* ── 3-2-1 countdown then a massive affirmation ───────────────────────── */
export function CountdownAffirmationEngine({ engine }: { engine: Countdown }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "count" | "show">("idle");
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (phase !== "count") return;
    if (count === 0) {
      setPhase("show");
      return;
    }
    const t = setTimeout(() => setCount(count - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, count]);

  function begin() {
    setCount(3);
    setPhase("count");
  }

  return (
    <div className="bg-primary-container rounded-3xl p-8 min-h-[320px] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-secondary-container/20 blur-[70px] rounded-full" />
      {phase === "idle" && (
        <>
          <p className="text-primary-fixed-dim text-label-md font-label-md text-center">
            Afirmasi {idx + 1}/{engine.affirmations.length} — berdiri tegak,
            tarik napas, lalu proyeksikan suara Anda.
          </p>
          <button
            type="button"
            onClick={begin}
            className="px-10 py-4 rounded-full bg-white text-primary-container font-heading font-extrabold text-title-lg active:scale-95 transition"
          >
            SIAP
          </button>
        </>
      )}
      {phase === "count" && (
        <span
          key={count}
          className="text-[120px] font-heading font-extrabold text-[#00e5ff] leading-none animate-ping [animation-iteration-count:1] [animation-duration:0.9s]"
        >
          {count}
        </span>
      )}
      {phase === "show" && (
        <>
          <p className="text-white text-center font-heading font-extrabold text-[34px] leading-tight tracking-tight">
            {engine.affirmations[idx]}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={begin}
              className="px-5 py-3 rounded-full border border-white/40 text-white font-label-md text-label-md active:scale-95 transition"
            >
              Ulangi
            </button>
            <button
              type="button"
              onClick={() => {
                setIdx((idx + 1) % engine.affirmations.length);
                setPhase("idle");
              }}
              className="px-5 py-3 rounded-full bg-white text-primary-container font-label-md text-label-md font-bold active:scale-95 transition"
            >
              Berikutnya
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Auto-advancing wizard steps (guided speaking / PREP / think-speak) ── */
export function WizardEngine({ engine }: { engine: Wizard }) {
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const step = engine.steps[idx];

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      const next = idx + 1;
      if (next < engine.steps.length) {
        setIdx(next);
        setRemaining(engine.steps[next].seconds);
      } else if (engine.loop) {
        setIdx(0);
        setRemaining(engine.steps[0].seconds);
      } else {
        setRemaining(null);
      }
      return;
    }
    const t = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, idx, engine]);

  const running = remaining !== null;
  const progress = running ? 1 - remaining / step.seconds : 0;

  return (
    <div className="flex flex-col gap-bento-gap">
      {/* Step dots */}
      <div className="flex items-center gap-2 justify-center">
        {engine.steps.map((s, i) => (
          <div
            key={i}
            className={cn(
              "h-2 rounded-full transition-all",
              i === idx ? "w-8 bg-secondary-container" : "w-2 bg-outline-variant",
            )}
          />
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6 min-h-[220px] flex flex-col items-center justify-center gap-4 text-center">
        <span className="px-3 py-1 rounded-full bg-secondary-container/10 text-secondary text-label-sm font-label-sm font-bold uppercase tracking-wider">
          {step.label}
        </span>
        <p className="text-title-lg font-title-lg text-primary max-w-sm">
          {step.text}
        </p>
        {running && (
          <div className="w-full max-w-xs flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
              <div
                className="h-full bg-secondary-container rounded-full transition-all duration-1000"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="font-heading font-bold text-secondary-container tabular-nums text-title-lg">
              {remaining}s
            </span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (running) {
            setRemaining(null);
          } else {
            setIdx(0);
            setRemaining(engine.steps[0].seconds);
          }
        }}
        className={cn(
          "py-3.5 rounded-2xl font-label-md text-label-md active:scale-95 transition",
          running
            ? "bg-surface-container-low text-on-surface-variant"
            : "bg-primary text-white",
        )}
      >
        {running ? "Hentikan Sesi" : "Mulai Sesi Terpandu"}
      </button>
    </div>
  );
}
