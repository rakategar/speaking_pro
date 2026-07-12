"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import { OnboardingIllustration } from "@/components/onboarding/OnboardingIllustration";

type Question = {
  key: string;
  icon: string;
  tone: "primary" | "secondary" | "tertiary";
  title: string;
  options: { value: string; label: string }[];
};

const QUESTIONS: Question[] = [
  {
    key: "experience_level",
    icon: "military_tech",
    tone: "primary",
    title: "Bagaimana kamu menilai kemampuan public speaking-mu saat ini?",
    options: [
      { value: "beginner", label: "Pemula -- masih sering deg-degan" },
      { value: "intermediate", label: "Menengah -- lumayan, tapi bisa lebih baik" },
      { value: "advanced", label: "Mahir -- sudah cukup percaya diri" },
      { value: "expert", label: "Expert -- sering jadi pembicara" },
    ],
  },
  {
    key: "practice_frequency",
    icon: "calendar_month",
    tone: "secondary",
    title: "Seberapa sering kamu tampil bicara di depan umum?",
    options: [
      { value: "never", label: "Belum pernah sama sekali" },
      { value: "rarely", label: "Jarang -- 1-2 kali setahun" },
      { value: "monthly", label: "Cukup sering -- hampir tiap bulan" },
      { value: "weekly", label: "Sangat sering -- tiap minggu" },
    ],
  },
  {
    key: "biggest_challenge",
    icon: "psychology",
    tone: "tertiary",
    title: "Apa tantangan terbesarmu saat bicara di depan umum?",
    options: [
      { value: "nervousness", label: "Gugup dan grogi" },
      { value: "monotone", label: "Intonasi datar / monoton" },
      { value: "pace", label: "Kecepatan bicara tidak stabil" },
      { value: "structure", label: "Sulit menyusun struktur cerita" },
    ],
  },
  {
    key: "speaking_context",
    icon: "co_present",
    tone: "primary",
    title: "Di konteks apa kamu paling sering butuh public speaking?",
    options: [
      { value: "work", label: "Presentasi kerja" },
      { value: "academic", label: "Kuliah atau akademik" },
      { value: "public_event", label: "Acara publik / MC" },
      { value: "social_media", label: "Konten media sosial" },
    ],
  },
  {
    key: "weekly_commitment",
    icon: "rocket_launch",
    tone: "secondary",
    title: "Berapa banyak waktu yang bisa kamu luangkan untuk latihan tiap minggu?",
    options: [
      { value: "under_15min", label: "Kurang dari 15 menit" },
      { value: "15_30min", label: "15 - 30 menit" },
      { value: "30_60min", label: "30 - 60 menit" },
      { value: "over_1h", label: "Lebih dari 1 jam" },
    ],
  },
];

export function OnboardingView({ fullName }: { fullName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = QUESTIONS[step];
  const selected = answers[question.key];
  const isLastStep = step === QUESTIONS.length - 1;
  const firstName = fullName?.trim().split(/\s+/)[0];

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [question.key]: value }));
    setError(null);
  }

  async function handleNext() {
    if (!selected) {
      setError("Pilih salah satu jawaban dulu, ya.");
      return;
    }
    if (!isLastStep) {
      setStep((s) => s + 1);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menyimpan jawaban.");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan jawaban.");
      setSubmitting(false);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  return (
    <div className="flex-1 flex flex-col bg-background px-margin-mobile pt-10 pb-8">
      <div className="mx-auto w-full max-w-lg flex-1 flex flex-col">
        <div className="flex flex-col items-center text-center">
          <Logo className="size-12" />
          <h1 className="mt-3 text-headline-md font-headline-md text-on-surface">
            {firstName ? `Selamat datang, ${firstName}!` : "Selamat datang!"}
          </h1>
          <p className="mt-1 text-body-md text-text-secondary">
            Jawab {QUESTIONS.length} pertanyaan singkat ini supaya latihanmu
            lebih terarah.
          </p>
        </div>

        <div className="mt-6 flex gap-1.5">
          {QUESTIONS.map((q, i) => (
            <span
              key={q.key}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                i <= step ? "bg-primary-container" : "bg-surface-container-high",
              )}
            />
          ))}
        </div>

        <div
          key={question.key}
          className="pop-in mt-8 flex-1 rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft"
        >
          <OnboardingIllustration icon={question.icon} tone={question.tone} />

          <p className="text-label-sm font-label-sm uppercase tracking-wide text-outline text-center">
            Pertanyaan {step + 1} dari {QUESTIONS.length}
          </p>
          <h2 className="mt-2 text-title-lg font-title-lg text-on-surface text-center">
            {question.title}
          </h2>

          <div className="mt-6 space-y-3">
            {question.options.map((option) => {
              const active = selected === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectOption(option.value)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3.5 text-left text-body-md transition-colors",
                    active
                      ? "border-secondary-container bg-primary-container text-on-primary shadow-sm"
                      : "border-outline-variant bg-surface-card text-on-surface hover:bg-surface-container-low",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-label-md font-label-md text-error text-center">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="flex items-center justify-center gap-1 rounded-full border-2 border-outline-variant bg-surface-card px-5 py-3.5 text-body-md font-semibold text-on-surface transition active:scale-[0.99] disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">
                arrow_back
              </span>
              Kembali
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary-container py-3.5 text-body-md font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
          >
            {submitting
              ? "Menyimpan..."
              : isLastStep
                ? "Selesai"
                : "Lanjut"}
            {!submitting && (
              <span className="material-symbols-outlined text-[20px]">
                {isLastStep ? "check" : "arrow_forward"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
