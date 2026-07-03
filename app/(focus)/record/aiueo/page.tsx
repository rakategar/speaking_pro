"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { useRecorder } from "@/components/recording/useRecorder";
import { cn } from "@/lib/utils";

const LETTERS = [
  {
    letter: "A",
    ipa: "/ɑː/",
    tip: "Buka mulut lebar-lebar dan ucapkan dengan jelas. Jaga lidah tetap datar agar resonansi terdengar ke seluruh ruangan.",
  },
  {
    letter: "I",
    ipa: "/iː/",
    tip: "Tarik sudut bibir ke samping seperti tersenyum lebar. Rasakan getaran di bagian depan mulut.",
  },
  {
    letter: "U",
    ipa: "/uː/",
    tip: "Majukan dan bulatkan bibir. Dorong suara dari diafragma, bukan dari tenggorokan.",
  },
  {
    letter: "E",
    ipa: "/eː/",
    tip: "Buka mulut setengah, bibir rileks. Jaga nada tetap stabil dari awal hingga akhir.",
  },
  {
    letter: "O",
    ipa: "/oː/",
    tip: "Bentuk bibir seperti lingkaran penuh. Bayangkan suara Anda mengisi ruangan besar.",
  },
];

export default function AiueoDrillPage() {
  const router = useRouter();
  const recorder = useRecorder();
  const [index, setIndex] = useState(0);
  const [doneLetters, setDoneLetters] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = LETTERS[index];
  const isRecording = recorder.status === "recording";
  const currentDone = doneLetters.has(index);

  async function toggleRecord() {
    if (isRecording) {
      await recorder.stop();
      setDoneLetters((prev) => new Set(prev).add(index));
      recorder.reset();
    } else {
      await recorder.start();
    }
  }

  async function nextLetter() {
    if (index < LETTERS.length - 1) {
      setIndex(index + 1);
      recorder.reset();
      return;
    }
    // All five vowels done -- log the drill.
    setSaving(true);
    try {
      await fetch("/api/drills/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleSlug: "aiueo-drill" }),
      });
    } finally {
      setSaving(false);
      setFinished(true);
    }
  }

  function retry() {
    setDoneLetters((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    recorder.reset();
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopAppBar variant="back" title="AIUEO Drill" />
        <main className="flex-1 flex flex-col items-center justify-center px-margin-mobile gap-6 text-center">
          <div className="w-24 h-24 rounded-full bg-secondary-container/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary-container text-[48px]">
              celebration
            </span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              Drill Selesai!
            </h2>
            <p className="text-body-md text-text-secondary mt-2 max-w-xs">
              Kelima vokal sudah Anda latih. Artikulasi yang konsisten setiap
              hari membangun kejelasan bicara.
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
      <TopAppBar variant="back" title="AIUEO Drill" />
      <main className="pt-24 px-margin-mobile max-w-2xl mx-auto flex flex-col gap-8">
        {/* Large letter display */}
        <div className="relative flex flex-col items-center justify-center py-12 px-6 bg-white rounded-3xl border border-stroke-subtle shadow-soft overflow-hidden">
          <div
            className={cn(
              "relative z-10 w-48 h-48 flex items-center justify-center rounded-full bg-white border-2 border-secondary-container/20 transition-shadow",
              isRecording && "glow-cyan-active",
            )}
          >
            <span className="text-[120px] text-primary tracking-tight leading-none font-bold font-heading">
              {current.letter}
            </span>
          </div>
          <div className="mt-8 text-center relative z-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container/10 text-secondary-container rounded-full font-label-sm text-label-sm mb-3">
              <span className="material-symbols-outlined text-[14px]">
                volume_up
              </span>
              Vokal Standar
            </span>
            <p className="font-title-lg text-title-lg text-primary">
              Ucapkan: {current.ipa}
            </p>
          </div>
        </div>

        {/* Coach's tip */}
        <div className="bg-primary-container p-6 rounded-3xl shadow-sm border border-white/5 relative overflow-hidden">
          <div className="flex gap-4 items-start relative z-10">
            <div className="p-3 rounded-2xl bg-on-primary-fixed-variant/20 text-secondary-fixed-dim">
              <span className="material-symbols-outlined">info</span>
            </div>
            <div>
              <h3 className="font-title-lg text-title-lg text-white mb-2">
                Tips Coach
              </h3>
              <p className="font-body-md text-body-md text-on-primary-container leading-relaxed">
                {current.tip}
              </p>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-secondary-container/20 blur-[50px] rounded-full" />
        </div>

        {/* Voice input */}
        <div className="bg-white rounded-3xl p-6 border border-stroke-subtle shadow-soft">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-label-md text-label-md text-text-secondary uppercase tracking-wider">
              Voice Analysis
            </h4>
            <div className="flex gap-1 h-6 items-center">
              {recorder.levels.slice(0, 5).map((level, i) => (
                <div
                  key={i}
                  className="w-1 bg-secondary-container rounded-full transition-all duration-100"
                  style={{
                    height: `${4 + (isRecording ? level : 0.05) * 20}px`,
                    opacity: 0.3 + 0.7 * (isRecording ? level : 0.3),
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex justify-center items-center py-4">
              <button
                type="button"
                onClick={toggleRecord}
                disabled={recorder.status === "requesting"}
                className={cn(
                  "group relative w-20 h-20 flex items-center justify-center text-white rounded-full shadow-[0_8px_25px_rgba(0,162,253,0.3)] hover:scale-105 active:scale-95 transition-all duration-300",
                  isRecording ? "bg-error" : "bg-secondary-container",
                )}
                aria-label={isRecording ? "Berhenti" : "Rekam"}
              >
                <span className="material-symbols-outlined text-4xl">
                  {isRecording ? "stop" : currentDone ? "check" : "mic"}
                </span>
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-error opacity-20 animate-ping pointer-events-none" />
                )}
              </button>
            </div>
            {recorder.error && (
              <p className="text-label-md text-on-error-container bg-error-container rounded-2xl px-4 py-3">
                {recorder.error}
              </p>
            )}
            <div className="grid grid-cols-2 gap-bento-gap">
              <button
                type="button"
                onClick={retry}
                className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-surface-container-low text-on-surface-variant font-label-md text-label-md hover:bg-surface-container transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined">replay</span>
                Ulangi
              </button>
              <button
                type="button"
                onClick={nextLetter}
                disabled={!currentDone || saving}
                className="flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-primary text-white font-label-md text-label-md hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-40"
              >
                {saving
                  ? "Menyimpan..."
                  : index === LETTERS.length - 1
                    ? "Selesai"
                    : "Huruf Berikutnya"}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-bento-gap items-center justify-between bg-surface-container-low p-4 rounded-2xl">
          <div className="flex -space-x-2">
            {LETTERS.map((l, i) => (
              <div
                key={l.letter}
                className={cn(
                  "w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold",
                  doneLetters.has(i)
                    ? "bg-secondary-container text-white"
                    : i === index
                      ? "bg-primary-container text-white"
                      : "bg-surface-container-highest text-on-surface-variant",
                )}
              >
                {l.letter}
              </div>
            ))}
          </div>
          <p className="font-label-sm text-label-sm text-text-secondary">
            Progress: {Math.round((doneLetters.size / LETTERS.length) * 100)}%
          </p>
        </div>
      </main>
    </div>
  );
}
