"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "paused"
  | "stopped"
  | "error";

const DEFAULT_MAX_SECONDS = 5 * 60;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * MediaRecorder + WebAudio AnalyserNode in one hook: drives the timer,
 * the live level bars, pause/resume, and a hard duration limit -- 5 minutes
 * by default (the Weekly Submission spec, "Durasi Maks 5 Menit"), or 30
 * seconds for free-tier trial users (see app/(focus)/record/page.tsx).
 */
export function useRecorder(opts?: { maxSeconds?: number }) {
  const MAX_SECONDS = opts?.maxSeconds ?? DEFAULT_MAX_SECONDS;
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // 7 normalized levels (0..1) for the soundwave bars.
  const [levels, setLevels] = useState<number[]>(Array(7).fill(0.1));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const stopResolveRef = useRef<((blob: Blob) => void) | null>(null);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const tickLevels = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    // Sample 7 bands across the voice spectrum.
    const bands = 7;
    const step = Math.floor(data.length / (bands + 2));
    const next = Array.from({ length: bands }, (_, i) => {
      const v = data[(i + 1) * step] / 255;
      return Math.max(0.08, v);
    });
    setLevels(next);
    rafRef.current = requestAnimationFrame(tickLevels);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        stopResolveRef.current?.(blob);
        stopResolveRef.current = null;
      };
      mediaRecorderRef.current = recorder;
      recorder.start(1000);

      secondsRef.current = 0;
      setSeconds(0);
      timerRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state !== "recording") return;
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_SECONDS) {
          mediaRecorderRef.current?.requestData();
          mediaRecorderRef.current?.pause();
          setStatus("paused");
        }
      }, 1000);

      rafRef.current = requestAnimationFrame(tickLevels);
      setStatus("recording");
    } catch (e) {
      console.error(e);
      setError(
        "Tidak bisa mengakses mikrofon. Izinkan akses mic di browser Anda.",
      );
      setStatus("error");
      cleanup();
    }
  }, [cleanup, tickLevels, MAX_SECONDS]);

  const pause = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r?.state === "recording") {
      r.pause();
      setStatus("paused");
    } else if (r?.state === "paused") {
      r.resume();
      setStatus("recording");
    }
  }, []);

  const stop = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const r = mediaRecorderRef.current;
      if (!r || r.state === "inactive") {
        resolve(new Blob(chunksRef.current, { type: "audio/webm" }));
        return;
      }
      stopResolveRef.current = (blob) => {
        cleanup();
        setStatus("stopped");
        resolve(blob);
      };
      r.stop();
    });
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    chunksRef.current = [];
    secondsRef.current = 0;
    setSeconds(0);
    setLevels(Array(7).fill(0.1));
    setStatus("idle");
    setError(null);
  }, [cleanup]);

  return {
    status,
    seconds,
    maxSeconds: MAX_SECONDS,
    levels,
    error,
    start,
    pause,
    stop,
    reset,
  };
}
