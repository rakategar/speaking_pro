"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useRecorder } from "@/components/recording/useRecorder";
import { Soundwave } from "@/components/recording/Soundwave";
import { ENVIRONMENTS } from "@/components/recording/environments";
import { EnablePush } from "@/components/push/EnablePush";
import { cn } from "@/lib/utils";

type Phase = "studio" | "uploading" | "queued" | "failed";

type QueueInfo = { active: boolean; position?: number; recordingId?: string };

const MIN_SECONDS = 15;

function formatTime(total: number) {
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const STEPS = [
  {
    title: "01. Pilih Atmosfer",
    body: "Sesuaikan lingkungan bicara Anda untuk simulasi yang nyata.",
  },
  {
    title: "02. Mulai Bicara",
    body: "Sampaikan materi Anda dengan percaya diri di depan audiens virtual.",
  },
  {
    title: "03. Masuk Antrean AI",
    body: "Rekaman masuk antrean analisis — Anda akan diberi notifikasi begitu rapor selesai, tanpa perlu menunggu.",
  },
];

function RecordingStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const moduleSlug = searchParams.get("module") ?? "free-recording";

  const recorder = useRecorder();
  const [envSlug, setEnvSlug] = useState(ENVIRONMENTS[0].slug);
  const [phase, setPhase] = useState<Phase>("studio");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [queuePos, setQueuePos] = useState<number | null>(null);
  const [pendingQueue, setPendingQueue] = useState<QueueInfo | null>(null);

  const env = ENVIRONMENTS.find((e) => e.slug === envSlug) ?? ENVIRONMENTS[0];
  const isLive = recorder.status === "recording" || recorder.status === "paused";
  const busy = phase === "uploading" || phase === "queued";

  // One analysis at a time: while the user still has a job in the queue,
  // recording is blocked. Poll so the page unblocks by itself when done.
  useEffect(() => {
    let stop = false;
    async function check() {
      try {
        const res = await fetch("/api/queue");
        if (!res.ok) return;
        const info: QueueInfo = await res.json();
        if (!stop) setPendingQueue(info.active ? info : null);
      } catch {
        /* offline etc. -- leave state as is */
      }
    }
    check();
    const t = setInterval(check, 10_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [phase]);

  const handleStopAndReview = useCallback(async () => {
    const durationSeconds = recorder.seconds;
    if (durationSeconds < MIN_SECONDS) {
      setErrorMsg(
        `Rekaman terlalu pendek. Bicaralah minimal ${MIN_SECONDS} detik agar AI bisa menilai struktur bahasa dan intonasi Anda.`,
      );
      return;
    }
    setErrorMsg(null);
    const blob = await recorder.stop();
    if (!blob || blob.size === 0) {
      setErrorMsg("Rekaman kosong. Coba rekam ulang.");
      setPhase("failed");
      return;
    }

    try {
      setPhase("uploading");
      const form = new FormData();
      form.append(
        "audio",
        new File([blob], "recording.webm", { type: blob.type }),
      );
      form.append("environment", envSlug);
      form.append("durationSeconds", String(durationSeconds));
      form.append("moduleSlug", moduleSlug);

      const uploadRes = await fetch("/api/recordings", {
        method: "POST",
        body: form,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Upload gagal");

      const analyzeRes = await fetch(
        `/api/recordings/${uploadJson.id}/analyze`,
        { method: "POST" },
      );
      const analyzeJson = await analyzeRes.json();
      if (!analyzeRes.ok) {
        throw new Error(analyzeJson.error ?? "Gagal masuk antrean analisis");
      }

      // Recording is now in the analysis queue -- no waiting here.
      setQueuePos(analyzeJson.position ?? null);
      setPhase("queued");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setPhase("failed");
    }
  }, [recorder, envSlug, moduleSlug]);

  // Hard cap: the recorder pauses itself at 5 minutes; submit automatically
  // so the user can't keep going past the limit.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (
      isLive &&
      phase === "studio" &&
      recorder.seconds >= recorder.maxSeconds &&
      !autoSubmitted.current
    ) {
      autoSubmitted.current = true;
      setErrorMsg("Batas 5 menit tercapai — rekaman dikirim otomatis.");
      handleStopAndReview();
    }
  }, [isLive, phase, recorder.seconds, recorder.maxSeconds, handleStopAndReview]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-margin-mobile py-8 relative w-full max-w-lg mx-auto pb-24 min-h-screen">
      {/* Close / back */}
      <button
        type="button"
        onClick={() => router.back()}
        className="absolute top-5 left-5 z-20 w-10 h-10 rounded-full bg-surface-card border border-stroke-subtle shadow-soft flex items-center justify-center text-on-surface-variant active:scale-95 transition"
        aria-label="Kembali"
        disabled={busy}
      >
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>

      {/* Timer header */}
      <div className="flex flex-col items-center mb-6">
        <div className="flex items-center gap-3 text-primary-container">
          {isLive && recorder.status === "recording" && (
            <div className="relative flex h-3 w-3 shadow-[0_0_12px_rgba(186,26,26,0.6)]">
              <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-error" />
            </div>
          )}
          {recorder.status === "paused" && (
            <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
              pause_circle
            </span>
          )}
          <span className="text-[40px] font-extrabold tracking-tight leading-none tabular-nums">
            {formatTime(recorder.seconds)}
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mt-2">
          {isLive
            ? "Recording Session • Min 00:15 • Maks 05:00"
            : "Siap Merekam • Min 00:15 • Maks 05:00"}
        </span>
      </div>

      {/* Bento recording card */}
      <div className="w-full max-w-lg mx-auto bg-white rounded-[24px] shadow-2xl border border-outline-variant/40 overflow-hidden flex flex-col">
        {/* Environment visual */}
        <div
          className="relative w-full overflow-hidden aspect-[3/4] transition-[background] duration-500"
          style={{ background: env.background }}
        >
          {/* Ambient scene icon */}
          <div className="absolute inset-0 flex items-end justify-center pb-24 opacity-20 pointer-events-none">
            <span className="material-symbols-outlined text-white text-[160px]">
              {env.icon}
            </span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

          {/* Privacy badge */}
          <div className="absolute top-4 inset-x-4 flex justify-between items-start z-10">
            <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
              <span className="material-symbols-outlined text-[14px]">lock</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                Privat
              </span>
            </div>
            <div className="bg-black/40 backdrop-blur-md text-white/90 px-3 py-1 rounded-full text-[10px] font-medium border border-white/20 max-w-[180px] truncate">
              {env.description}
            </div>
          </div>

          {/* Center mic + live soundwave */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-6">
            <button
              type="button"
              onClick={
                recorder.status === "idle" || recorder.status === "error"
                  ? recorder.start
                  : recorder.pause
              }
              disabled={busy || recorder.status === "requesting"}
              className={cn(
                "w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center text-primary-container shadow-2xl active:scale-95 transition-transform disabled:opacity-70",
                recorder.status === "recording" && "glow-cyan-active",
              )}
              aria-label={
                recorder.status === "recording"
                  ? "Jeda rekaman"
                  : "Mulai merekam"
              }
            >
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {recorder.status === "requesting"
                  ? "hourglass_top"
                  : recorder.status === "recording"
                    ? "pause"
                    : "mic"}
              </span>
            </button>
            {isLive ? (
              <div className="text-light-aqua">
                <Soundwave
                  levels={recorder.levels}
                  active={recorder.status === "recording"}
                />
              </div>
            ) : (
              <p className="text-white/80 text-sm font-medium px-8 text-center">
                Ketuk mic untuk mulai berlatih di {env.label}
              </p>
            )}
          </div>

          {/* Environment chips */}
          <div className="absolute bottom-4 inset-x-0 overflow-x-auto hide-scrollbar z-10">
            <div className="flex items-center justify-center gap-2 px-4 min-w-max">
              {ENVIRONMENTS.map((e) => (
                <button
                  key={e.slug}
                  type="button"
                  onClick={() => setEnvSlug(e.slug)}
                  disabled={busy}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-[12px] transition-colors",
                    e.slug === envSlug
                      ? "bg-white text-primary-container font-semibold shadow-sm"
                      : "bg-black/30 backdrop-blur-md text-white font-medium border border-white/10",
                  )}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-6 flex items-center gap-4 bg-white">
          {isLive ? (
            <>
              <button
                type="button"
                onClick={recorder.pause}
                className="w-14 h-14 rounded-full border border-outline-variant/40 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors shrink-0"
                aria-label={
                  recorder.status === "paused" ? "Lanjutkan" : "Jeda"
                }
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {recorder.status === "paused" ? "play_arrow" : "pause"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleStopAndReview}
                disabled={recorder.seconds < MIN_SECONDS}
                className="flex-1 h-14 rounded-full bg-primary-container text-on-primary font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  stop_circle
                </span>
                {recorder.seconds < MIN_SECONDS
                  ? `Stop (min. ${MIN_SECONDS - recorder.seconds} dtk lagi)`
                  : "Stop & Review"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={recorder.start}
              disabled={busy || recorder.status === "requesting"}
              className="flex-1 h-14 rounded-full bg-secondary-container text-on-secondary font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md disabled:opacity-60"
            >
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mic
              </span>
              {recorder.status === "requesting"
                ? "Meminta akses mic..."
                : "Mulai Rekam"}
            </button>
          )}
        </div>
      </div>

      {(recorder.error || errorMsg) && (
        <p
          role="alert"
          className="mt-4 w-full rounded-2xl bg-error-container text-on-error-container px-4 py-3 text-label-md font-label-md"
        >
          {recorder.error ?? errorMsg}
        </p>
      )}

      {/* Cara Kerja */}
      <div className="w-full mt-8">
        <h3 className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-4 px-6">
          Cara Kerja
        </h3>
        <div className="flex overflow-x-auto gap-4 px-6 pb-4 hide-scrollbar snap-x snap-mandatory">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="min-w-[280px] bg-white p-4 rounded-[24px] shadow-sm border border-outline-variant/10 snap-center flex flex-col gap-2"
            >
              <span className="text-[14px] font-bold text-primary-container">
                {step.title}
              </span>
              <p className="text-[12px] text-on-surface-variant/80 leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Uploading overlay */}
      {phase === "uploading" && (
        <div className="fixed inset-0 z-50 bg-primary-container/90 backdrop-blur-md flex flex-col items-center justify-center gap-6 px-10 text-center">
          <div className="text-light-aqua">
            <Soundwave />
          </div>
          <div>
            <p className="text-white font-heading text-title-lg font-bold">
              Mengunggah rekaman...
            </p>
            <p className="text-white/60 text-sm mt-2">
              Menyimpan audio Anda dengan aman.
            </p>
          </div>
        </div>
      )}

      {/* Queued (submitted) overlay -- no waiting: results come later */}
      {phase === "queued" && (
        <div className="fixed inset-0 z-50 bg-primary-container/95 backdrop-blur-md flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-light-aqua text-[40px]">
              schedule_send
            </span>
          </div>
          <div>
            <p className="text-white font-heading text-title-lg font-bold">
              Masuk Antrean Analisis
            </p>
            <p className="text-white/70 text-sm mt-2 max-w-sm">
              Rekaman Anda ada di{" "}
              <span className="font-bold text-light-aqua">
                antrean #{queuePos ?? "-"}
              </span>
              . Anda tidak perlu menunggu di halaman ini — hasilnya bisa
              dilihat di Riwayat begitu selesai.
            </p>
          </div>
          <EnablePush className="w-full max-w-xs" />
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link
              href="/history"
              className="h-12 rounded-full bg-white text-primary-container font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                history
              </span>
              Lihat Antrean di Riwayat
            </Link>
            <Link
              href="/dashboard"
              className="h-12 rounded-full border border-white/30 text-white font-semibold flex items-center justify-center"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Blocked: a previous analysis is still in the queue */}
      {phase === "studio" && pendingQueue?.active && (
        <div className="fixed inset-0 z-40 bg-primary-container/95 backdrop-blur-md flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-light-aqua text-[40px]">
              hourglass_top
            </span>
          </div>
          <div>
            <p className="text-white font-heading text-title-lg font-bold">
              Analisis Sebelumnya Masih Diproses
            </p>
            <p className="text-white/70 text-sm mt-2 max-w-sm">
              Rekaman Anda masih dalam{" "}
              <span className="font-bold text-light-aqua">
                antrean #{pendingQueue.position ?? "-"}
              </span>
              . Anda bisa merekam lagi setelah analisis ini selesai — halaman
              ini akan terbuka otomatis.
            </p>
          </div>
          <EnablePush className="w-full max-w-xs" />
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Link
              href="/history"
              className="h-12 rounded-full bg-white text-primary-container font-semibold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">
                history
              </span>
              Lihat Riwayat
            </Link>
            <Link
              href="/dashboard"
              className="h-12 rounded-full border border-white/30 text-white font-semibold flex items-center justify-center"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Failed actions */}
      {phase === "failed" && (
        <div className="w-full mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setPhase("studio");
              setErrorMsg(null);
              recorder.reset();
            }}
            className="flex-1 h-12 rounded-full border border-outline-variant text-on-surface font-semibold"
          >
            Rekam Ulang
          </button>
        </div>
      )}
    </main>
  );
}

export default function RecordPage() {
  return (
    <Suspense>
      <RecordingStudio />
    </Suspense>
  );
}
