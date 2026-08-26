"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Playback for the user's own studio recording on the analysis result page.
//
// Hand-rolled rather than <audio controls> so it matches the app's design
// language -- the native widget renders completely differently in Safari,
// Chrome and Firefox, and there is no way to restyle it. The <audio> element
// is still what does the work; it is just kept out of the layout and driven
// through a ref.
//
// Seeking depends on /api/recordings/[id]/audio answering Range requests.

const SPEEDS = [0.75, 1, 1.25] as const;

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AudioPlayer({
  recordingId,
  durationSeconds,
}: {
  recordingId: string;
  /** From the recordings row -- lets the total show before metadata loads. */
  durationSeconds?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(
    durationSeconds && Number.isFinite(durationSeconds) ? durationSeconds : 0,
  );
  const [speed, setSpeed] = useState<number>(1);
  const [failed, setFailed] = useState(false);

  // Chrome reports duration Infinity for MediaRecorder webm until the whole
  // file has been seen, so keep the row's own duration whenever the element's
  // is not a usable number.
  const onLoadedMetadata = useCallback(() => {
    const value = audioRef.current?.duration;
    if (value && Number.isFinite(value) && value > 0) setDuration(value);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
  }, [speed]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setFailed(true));
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  }, []);

  const progress = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  if (failed) {
    return (
      <section className="bg-surface-card rounded-3xl border border-stroke-subtle shadow-sm p-4">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined">headphones_off</span>
          <p className="font-body-md text-body-md">
            Rekaman tidak tersedia untuk diputar.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface-card rounded-3xl border border-stroke-subtle shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-secondary-container">
          headphones
        </span>
        <h2 className="font-title-md text-title-md text-primary">
          Dengarkan Rekaman Anda
        </h2>
      </div>

      <audio
        ref={audioRef}
        src={`/api/recordings/${recordingId}/audio`}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={onLoadedMetadata}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        onError={() => setFailed(true)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Jeda" : "Putar"}
          className="shrink-0 w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md transition-transform active:scale-95"
        >
          <span
            className="material-symbols-outlined text-[26px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {playing ? "pause" : "play_arrow"}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          {/* A range input rather than a styled div: it gives keyboard seeking
              and screen-reader semantics for free. */}
          <input
            type="range"
            min={0}
            max={duration > 0 ? duration : 0}
            step={0.1}
            value={Math.min(current, duration)}
            disabled={duration <= 0}
            onChange={(e) => seek(Number(e.currentTarget.value))}
            aria-label="Posisi pemutaran"
            className="audio-scrub w-full"
            style={{ ["--progress" as string]: `${progress}%` }}
          />
          <div className="flex justify-between mt-1 font-label-sm text-label-sm text-on-surface-variant tabular-nums">
            <span>{clock(current)}</span>
            <span>{clock(duration)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          Kecepatan
        </span>
        {SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSpeed(value)}
            aria-pressed={speed === value}
            className={
              speed === value
                ? "px-3 py-1 rounded-full font-label-sm text-label-sm bg-secondary-container/15 text-secondary-container border border-secondary-container/40"
                : "px-3 py-1 rounded-full font-label-sm text-label-sm text-on-surface-variant border border-stroke-subtle hover:bg-surface-container-high transition-colors"
            }
          >
            {value}&times;
          </button>
        ))}
      </div>
    </section>
  );
}
