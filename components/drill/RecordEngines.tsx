"use client";

import { useEffect, useRef, useState } from "react";
import { useRecorder } from "@/components/recording/useRecorder";
import type { DrillEngine } from "@/lib/drills/content";
import { cn } from "@/lib/utils";

type LocalRecord = Extract<DrillEngine, { kind: "local-record" }>;

/**
 * Record → listen back → self-assess, all inside the browser. The audio
 * blob never leaves the device (PRD "Local-First Engine": no upload, no
 * AI call — the user is the evaluator).
 */
export function LocalRecordEngine({ engine }: { engine: LocalRecord }) {
  const recorder = useRecorder();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [fillers, setFillers] = useState(0);
  const urlRef = useRef<string | null>(null);

  const isRecording = recorder.status === "recording";

  // Local drills are short: stop automatically at the engine limit.
  useEffect(() => {
    if (isRecording && recorder.seconds >= engine.maxSeconds) {
      void finishRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.seconds, isRecording]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function finishRecording() {
    const blob = await recorder.stop();
    if (blob && blob.size > 0) {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setBlobUrl(url);
    }
    recorder.reset();
  }

  function reRecord() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setBlobUrl(null);
    setChecked(new Set());
    setFillers(0);
  }

  const fillerVerdict =
    fillers <= 2
      ? { text: "Hebat! Nyaris bebas filler word.", cls: "text-secondary" }
      : fillers <= 5
        ? { text: "Lumayan — masih ada ruang untuk jeda sadar.", cls: "text-orange-500" }
        : { text: "Ulangi drill ini besok; ganti 'eee' dengan diam.", cls: "text-error" };

  return (
    <div className="flex flex-col gap-bento-gap">
      {/* Prompt / script */}
      <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6 flex flex-col gap-3">
        <p className="text-body-md text-text-secondary">{engine.prompt}</p>
        {engine.scriptText && (
          <p className="text-[19px] leading-[1.9] text-on-surface font-medium">
            {engine.scriptText}
          </p>
        )}
        <p className="text-label-sm font-label-sm text-text-secondary flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Rekaman hanya tersimpan di perangkat Anda — tidak diunggah.
        </p>
      </div>

      {/* Recorder / player */}
      {!blobUrl ? (
        <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6 flex flex-col items-center gap-4">
          <div className="flex gap-1 h-8 items-center">
            {recorder.levels.map((level, i) => (
              <div
                key={i}
                className="w-1.5 bg-secondary-container rounded-full transition-all duration-100"
                style={{
                  height: `${6 + (isRecording ? level : 0.06) * 26}px`,
                  opacity: 0.3 + 0.7 * (isRecording ? level : 0.3),
                }}
              />
            ))}
          </div>
          <span className="font-heading font-extrabold text-[32px] text-primary tabular-nums">
            {String(Math.floor(recorder.seconds / 60)).padStart(2, "0")}:
            {String(recorder.seconds % 60).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={isRecording ? finishRecording : recorder.start}
            disabled={recorder.status === "requesting"}
            className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition",
              isRecording ? "bg-error" : "bg-secondary-container",
            )}
            aria-label={isRecording ? "Berhenti" : "Rekam"}
          >
            <span className="material-symbols-outlined text-4xl">
              {isRecording ? "stop" : "mic"}
            </span>
          </button>
          <p className="text-label-sm font-label-sm text-text-secondary">
            Maks {engine.maxSeconds} detik — berhenti otomatis.
          </p>
          {recorder.error && (
            <p className="text-label-md text-on-error-container bg-error-container rounded-2xl px-4 py-3 w-full">
              {recorder.error}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-6 flex flex-col gap-4">
          <p className="font-label-md text-label-md text-text-secondary uppercase tracking-wider">
            Dengarkan Kembali
          </p>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls src={blobUrl} className="w-full" />

          {engine.checklist && (
            <div className="flex flex-col gap-2 mt-2">
              <p className="font-label-md text-label-md text-primary">
                Evaluasi mandiri — centang yang sudah tercapai:
              </p>
              {engine.checklist.map((item, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() =>
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className="mt-0.5 w-5 h-5 accent-[#00a2fd]"
                  />
                  <span className="text-body-md text-on-surface">{item}</span>
                </label>
              ))}
              <p className="text-label-sm font-label-sm text-text-secondary">
                {checked.size}/{engine.checklist.length} tercapai
                {checked.size === engine.checklist.length && " — sempurna! 🎉"}
              </p>
            </div>
          )}

          {engine.fillerCounter && (
            <div className="flex flex-col items-center gap-3 mt-2 p-4 rounded-2xl bg-surface-container-low">
              <p className="font-label-md text-label-md text-primary text-center">
                Tekan setiap kali mendengar &ldquo;eee&rdquo;, &ldquo;hmm&rdquo;,
                atau &ldquo;anu&rdquo;:
              </p>
              <button
                type="button"
                onClick={() => setFillers(fillers + 1)}
                className="px-8 py-4 rounded-full bg-primary text-white font-heading font-extrabold text-title-lg active:scale-95 transition"
              >
                +1 Filler Word
              </button>
              <p className="font-heading font-extrabold text-[40px] text-primary tabular-nums leading-none">
                {fillers}
              </p>
              <p className={cn("text-label-md font-label-md", fillerVerdict.cls)}>
                {fillerVerdict.text}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={reRecord}
            className="py-3.5 rounded-2xl bg-surface-container-low text-on-surface-variant font-label-md text-label-md active:scale-95 transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">replay</span>
            Rekam Ulang
          </button>
        </div>
      )}
    </div>
  );
}
