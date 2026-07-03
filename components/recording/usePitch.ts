"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HISTORY_LEN = 48;
const MIN_HZ = 70;
const MAX_HZ = 400;

/**
 * Autocorrelation pitch detector (ACF2+). Returns -1 when the frame is
 * unvoiced/too quiet. Standard implementation adapted for speech range.
 */
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.01) return -1; // too quiet

  let r1 = 0;
  let r2 = buf.length - 1;
  const threshold = 0.2;
  for (let i = 0; i < buf.length / 2; i++) {
    if (Math.abs(buf[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < buf.length / 2; i++) {
    if (Math.abs(buf[buf.length - i]) < threshold) {
      r2 = buf.length - i;
      break;
    }
  }
  const trimmed = buf.slice(r1, r2);
  const size = trimmed.length;
  if (size < 2) return -1;

  const c = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) {
      c[i] += trimmed[j] * trimmed[j + i];
    }
  }

  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  if (maxpos <= 0) return -1;

  let T0 = maxpos;
  // Parabolic interpolation for sub-sample accuracy.
  const x1 = c[T0 - 1];
  const x2 = c[T0];
  const x3 = c[T0 + 1] ?? x2;
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  const hz = sampleRate / T0;
  if (hz < MIN_HZ || hz > MAX_HZ) return -1;
  return hz;
}

export type PitchState = {
  /** Rolling pitch trace, Hz; NaN = unvoiced frame */
  history: number[];
  /** Latest voiced pitch in Hz, or null */
  currentHz: number | null;
  /** Std deviation of voiced pitches in the window (intonation liveliness) */
  variation: number;
  active: boolean;
  error: string | null;
};

export function usePitch() {
  const [state, setState] = useState<PitchState>({
    history: Array(HISTORY_LEN).fill(NaN),
    currentHz: null,
    variation: 0,
    active: false,
    error: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const historyRef = useRef<number[]>(Array(HISTORY_LEN).fill(NaN));
  const lastSampleRef = useRef(0);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const ctx = audioCtxRef.current;
    if (!analyser || !ctx) return;

    // Sample ~12x/s so the trace scrolls at a readable speed.
    const now = performance.now();
    if (now - lastSampleRef.current > 80) {
      lastSampleRef.current = now;
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      const hz = autoCorrelate(buf, ctx.sampleRate);

      const next = [...historyRef.current.slice(1), hz > 0 ? hz : NaN];
      historyRef.current = next;

      const voiced = next.filter((v) => !Number.isNaN(v));
      const mean = voiced.length
        ? voiced.reduce((a, b) => a + b, 0) / voiced.length
        : 0;
      const variation = voiced.length
        ? Math.sqrt(
            voiced.reduce((a, b) => a + (b - mean) ** 2, 0) / voiced.length,
          )
        : 0;

      setState((s) => ({
        ...s,
        history: next,
        currentHz: hz > 0 ? Math.round(hz) : null,
        variation: Math.round(variation),
      }));
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: false },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;
      setState((s) => ({ ...s, active: true, error: null }));
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setState((s) => ({
        ...s,
        error:
          "Tidak bisa mengakses mikrofon. Izinkan akses mic di browser Anda.",
      }));
    }
  }, [tick]);

  const stop = useCallback(() => {
    cleanup();
    setState((s) => ({ ...s, active: false }));
  }, [cleanup]);

  return { ...state, start, stop, minHz: MIN_HZ, maxHz: MAX_HZ };
}
