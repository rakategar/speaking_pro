"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DrillEngine,
  EmphasisSegment,
  ToneSegment,
} from "@/lib/drills/content";
import { cn } from "@/lib/utils";

type WordHighlight = Extract<DrillEngine, { kind: "word-highlight" }>;
type EnergyTabs = Extract<DrillEngine, { kind: "energy-tabs" }>;
type BlankSpace = Extract<DrillEngine, { kind: "blank-space" }>;
type Comparison = Extract<DrillEngine, { kind: "comparison" }>;
type StructureBoxes = Extract<DrillEngine, { kind: "structure-boxes" }>;

/* ── Teleprompter / pause-guide: highlight jumps word by word ─────────── */
export function WordHighlightEngine({ engine }: { engine: WordHighlight }) {
  const [wpm, setWpm] = useState(engine.defaultWpm);
  const [running, setRunning] = useState(false);
  const [sentence, setSentence] = useState(0);
  const [word, setWord] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const words = engine.sentences[sentence].split(/\s+/);
  const isPause = words[word] === "//";

  useEffect(() => {
    if (!running) return;
    const delay = isPause ? (engine.pauseMs ?? 1500) : 60_000 / wpm;
    timerRef.current = setTimeout(() => {
      if (word < words.length - 1) {
        setWord(word + 1);
      } else if (sentence < engine.sentences.length - 1) {
        setSentence(sentence + 1);
        setWord(0);
      } else {
        setRunning(false);
      }
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [running, sentence, word, wpm, isPause, words.length, engine]);

  function restart() {
    setSentence(0);
    setWord(0);
    setRunning(true);
  }

  return (
    <div className="flex flex-col gap-bento-gap">
      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6 min-h-[180px] flex flex-col justify-center">
        <p className="font-label-sm text-label-sm text-text-secondary mb-4 uppercase tracking-wider">
          Kalimat {sentence + 1}/{engine.sentences.length}
        </p>
        <p className="text-[22px] leading-[1.9] font-heading font-semibold text-primary">
          {words.map((w, i) =>
            w === "//" ? (
              <span
                key={i}
                className={cn(
                  "mx-1 px-2 py-0.5 rounded-lg text-[16px] align-middle",
                  running && i === word
                    ? "bg-error text-white animate-pulse"
                    : "bg-surface-container text-text-secondary",
                )}
              >
                jeda
              </span>
            ) : (
              <span
                key={i}
                className={cn(
                  "rounded-md px-0.5 transition-colors",
                  running && i === word && "bg-secondary-container text-white",
                  running && i < word && "text-text-secondary",
                )}
              >
                {w}{" "}
              </span>
            ),
          )}
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-label-md text-label-md text-text-secondary">
            Kecepatan
          </span>
          <span className="font-label-md text-label-md font-bold text-secondary-container">
            {wpm} kata/menit
          </span>
        </div>
        <input
          type="range"
          min={engine.minWpm}
          max={engine.maxWpm}
          step={5}
          value={wpm}
          onChange={(e) => setWpm(Number(e.target.value))}
          className="w-full accent-[#00a2fd]"
        />
        <div className="grid grid-cols-2 gap-bento-gap">
          <button
            type="button"
            onClick={() => (running ? setRunning(false) : restart())}
            className="py-3.5 rounded-2xl bg-primary text-white font-label-md text-label-md active:scale-95 transition"
          >
            {running ? "Berhenti" : "Mulai"}
          </button>
          <button
            type="button"
            onClick={restart}
            className="py-3.5 rounded-2xl bg-surface-container-low text-on-surface-variant font-label-md text-label-md active:scale-95 transition"
          >
            Ulangi dari Awal
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Colored-tone reading text ────────────────────────────────────────── */
const TONE_STYLE: Record<ToneSegment["tone"], string> = {
  low: "text-primary-container font-bold",
  mid: "text-secondary",
  high: "text-[#00b6d9] font-extrabold",
};
const TONE_LABEL: Record<ToneSegment["tone"], string> = {
  low: "Nada rendah",
  mid: "Nada sedang",
  high: "Nada tinggi",
};

export function ToneTextEngine({ segments }: { segments: ToneSegment[] }) {
  return (
    <div className="flex flex-col gap-bento-gap">
      <div className="flex gap-2 flex-wrap">
        {(["low", "mid", "high"] as const).map((t) => (
          <span
            key={t}
            className={cn(
              "px-3 py-1.5 rounded-full bg-white border border-stroke-subtle text-label-sm font-label-sm",
              TONE_STYLE[t],
            )}
          >
            ⬤ {TONE_LABEL[t]}
          </span>
        ))}
      </div>
      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6">
        <p className="text-[20px] leading-[2]">
          {segments.map((s, i) => (
            <span key={i} className={TONE_STYLE[s.tone]}>
              {s.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

/* ── Oversized-keyword emphasis text ──────────────────────────────────── */
export function EmphasisTextEngine({
  segments,
}: {
  segments: EmphasisSegment[];
}) {
  return (
    <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6">
      <p className="text-[18px] leading-[2.2] text-on-surface">
        {segments.map((s, i) =>
          s.big ? (
            <span
              key={i}
              className="text-[34px] font-extrabold font-heading text-secondary-container align-middle"
            >
              {s.text}
            </span>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
    </div>
  );
}

/* ── Same script, three emotional "moods" ─────────────────────────────── */
export function EnergyTabsEngine({ engine }: { engine: EnergyTabs }) {
  const [active, setActive] = useState(0);
  const mood = engine.moods[active];
  return (
    <div className="flex flex-col gap-bento-gap">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar">
        {engine.moods.map((m, i) => (
          <button
            key={m.label}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-full font-label-md text-label-md transition-colors",
              i === active
                ? "bg-primary text-white"
                : "bg-white text-text-secondary border border-stroke-subtle",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          "rounded-3xl p-6 shadow-soft transition-colors flex flex-col gap-4",
          mood.cardClass,
        )}
      >
        <p className="text-[20px] leading-[1.9] font-heading font-semibold">
          {engine.script}
        </p>
        <div className="flex items-start gap-2 opacity-90">
          <span className="material-symbols-outlined text-[18px] mt-0.5">
            tips_and_updates
          </span>
          <p className="text-label-md font-label-md">{mood.instruction}</p>
        </div>
      </div>
    </div>
  );
}

/* ── "Blank Space" anti-filler hold button ────────────────────────────── */
export function BlankSpaceEngine({ engine }: { engine: BlankSpace }) {
  const [holding, setHolding] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col gap-bento-gap">
      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6">
        <p className="text-body-lg text-on-surface leading-relaxed">
          {engine.script}
        </p>
      </div>
      <div className="bg-primary-container rounded-3xl p-6 flex flex-col items-center gap-4">
        <p className="text-on-primary-container text-label-md font-label-md text-center">
          Filler word mau keluar? Tekan &amp; tahan — memilih diam adalah
          kemenangan.
        </p>
        <button
          type="button"
          onPointerDown={() => {
            setHolding(true);
            setCount((c) => c + 1);
          }}
          onPointerUp={() => setHolding(false)}
          onPointerLeave={() => setHolding(false)}
          className="w-full h-20 rounded-full bg-white text-primary-container font-heading font-extrabold text-title-lg flex items-center justify-center gap-3 active:scale-95 transition select-none touch-none"
        >
          <span className="material-symbols-outlined text-[28px]">
            back_hand
          </span>
          BLANK SPACE
        </button>
        <p className="text-primary-fixed-dim text-label-sm font-label-sm">
          Dipakai {count}× sesi ini — semakin sering di awal, semakin sadar Anda.
        </p>
      </div>
      {holding && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center gap-4 pointer-events-none">
          <span className="material-symbols-outlined text-white/60 text-[56px]">
            self_improvement
          </span>
          <p className="text-white/80 font-heading text-title-lg font-bold">
            Diam. Tarik napas.
          </p>
          <p className="text-white/50 text-label-md font-label-md">
            Lepaskan saat kalimat berikutnya siap.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Bad vs good opening/closing comparison ───────────────────────────── */
export function ComparisonEngine({ engine }: { engine: Comparison }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  return (
    <div className="flex flex-col gap-bento-gap">
      {engine.pairs.map((p, i) => (
        <div
          key={i}
          className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-5 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md font-bold text-primary uppercase tracking-wider">
              {p.title}
            </span>
            <button
              type="button"
              onClick={() =>
                setHidden((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              className="text-label-sm font-label-sm text-secondary flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">
                {hidden.has(i) ? "visibility" : "visibility_off"}
              </span>
              {hidden.has(i) ? "Tampilkan versi baik" : "Uji ingatan"}
            </button>
          </div>
          <div className="rounded-2xl bg-error-container/40 border border-error/10 p-4">
            <p className="text-label-sm font-label-sm text-error mb-1">
              ✗ Klise
            </p>
            <p className="text-body-md text-on-surface-variant italic">
              &ldquo;{p.bad}&rdquo;
            </p>
          </div>
          <div className="rounded-2xl bg-secondary-fixed/30 border border-secondary-fixed/50 p-4">
            <p className="text-label-sm font-label-sm text-secondary mb-1">
              ✓ Berdampak — ucapkan lantang!
            </p>
            <p className="text-body-md text-on-surface font-medium">
              {hidden.has(i)
                ? "· · · coba ucapkan ulang dengan kata-kata Anda sendiri · · ·"
                : `“${p.good}”`}
            </p>
          </div>
          <p className="text-label-sm font-label-sm text-text-secondary">
            💡 {p.note}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Sequential structure boxes (Hook → Story → Lesson) ───────────────── */
export function StructureBoxesEngine({ engine }: { engine: StructureBoxes }) {
  const [active, setActive] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      setDone((prev) => new Set(prev).add(active));
      setRemaining(null);
      setActive((a) => Math.min(a + 1, engine.boxes.length - 1));
      return;
    }
    const t = setTimeout(() => setRemaining(remaining - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, active, engine.boxes.length]);

  const allDone = done.size === engine.boxes.length;

  return (
    <div className="flex flex-col gap-bento-gap">
      {engine.boxes.map((box, i) => {
        const isActive = i === active && !allDone;
        const isDone = done.has(i);
        return (
          <div
            key={box.title}
            className={cn(
              "rounded-3xl p-5 border transition-all flex flex-col gap-3",
              isDone
                ? "bg-secondary-fixed/30 border-secondary-fixed/60"
                : isActive
                  ? "bg-white border-secondary-container shadow-[0_0_0_2px_rgba(0,162,253,0.25)]"
                  : "bg-surface-container-low border-stroke-subtle opacity-70",
            )}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-title-lg text-title-lg text-primary">
                {box.title}
              </h4>
              {isDone ? (
                <span className="material-symbols-outlined text-secondary">
                  check_circle
                </span>
              ) : (
                <span className="text-label-sm font-label-sm text-text-secondary">
                  {box.seconds} dtk
                </span>
              )}
            </div>
            <p className="text-body-md text-text-secondary">{box.hint}</p>
            <div className="flex gap-2 flex-wrap">
              {box.starters.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 rounded-full bg-secondary-container/10 text-secondary text-label-sm font-label-sm"
                >
                  {s}
                </span>
              ))}
            </div>
            {isActive &&
              (remaining !== null ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className="h-full bg-secondary-container rounded-full transition-all duration-1000"
                      style={{
                        width: `${(1 - remaining / box.seconds) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="font-heading font-bold text-secondary-container tabular-nums">
                    {remaining}s
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRemaining(box.seconds)}
                  className="py-3 rounded-2xl bg-primary text-white font-label-md text-label-md active:scale-95 transition"
                >
                  Mulai Bicara ({box.seconds} detik)
                </button>
              ))}
          </div>
        );
      })}
      {allDone && (
        <button
          type="button"
          onClick={() => {
            setDone(new Set());
            setActive(0);
            setRemaining(null);
          }}
          className="py-3.5 rounded-2xl bg-surface-container-low text-on-surface-variant font-label-md text-label-md active:scale-95 transition"
        >
          🎉 Cerita utuh selesai — ulangi dengan topik lain
        </button>
      )}
    </div>
  );
}
