"use client";

import { useCallback, useLayoutEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  FaisalAvatar,
  type FaisalExpression,
} from "@/components/ui/FaisalAvatar";

// One-time guided tour shown on the dashboard right after onboarding
// (profiles.tutorial_completed gates it, DB-backed like trial_nudges_seen so
// it never re-appears across devices). Each step darkens the screen and cuts
// a bright spotlight around a [data-tutorial="..."] element with expanding
// wave rings, while Faisal "speaks" the instruction through a chat bubble
// above his head. Skippable at any point.

type Step = {
  target: string | null; // data-tutorial attribute value; null = centered intro
  sticker: FaisalExpression;
  text: string;
};

const STEPS: Step[] = [
  {
    target: null,
    sticker: "waving-mic",
    text: "Halo! Saya Faisal, coach kamu di Speaking Pro. Yuk ikuti tur singkat ini biar kamu langsung tahu cara pakai aplikasinya!",
  },
  {
    target: "daily-plan",
    sticker: "tip-mic",
    text: "Ini menu latihan harianmu. Selesaikan drill di sini setiap hari untuk mengejar target 10 menit dan menjaga streak-mu.",
  },
  {
    target: "weekly-record",
    sticker: "speaking-confident",
    text: "Seminggu sekali, rekam suaramu lewat tombol ini. AI kami akan menganalisis dan memberikan rapor lengkap kemampuan bicaramu.",
  },
  {
    target: "progress-snap",
    sticker: "analyzing",
    text: "Pantau perkembangan skormu dari waktu ke waktu di kartu ini. Ketuk untuk melihat rapor terakhirmu.",
  },
  {
    target: "nav-library",
    sticker: "thinking-idea",
    text: "Mau latihan di luar menu harian? Semua modul latihan bisa kamu jelajahi kapan saja di tab Library.",
  },
  {
    target: "nav-profile",
    sticker: "finger-heart",
    text: "Terakhir: atur akun, unduh ringkasan mingguan, dan cari bantuan lewat tab Profile. Selamat berlatih!",
  },
];

const SPOT_PAD = 8;
const PANEL_GAP = 20;
const PANEL_MIN_SPACE = 240;

type Rect = { top: number; left: number; width: number; height: number };

export function TutorialOverlay({ userId }: { userId: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const measure = useCallback(() => {
    if (!step.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(
      `[data-tutorial="${step.target}"]`,
    );
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - SPOT_PAD,
      left: r.left - SPOT_PAD,
      width: r.width + SPOT_PAD * 2,
      height: r.height + SPOT_PAD * 2,
    });
  }, [step.target]);

  useLayoutEffect(() => {
    if (step.target) {
      // Bring the target into view first, then measure on the next frame so
      // the rect reflects the post-scroll position.
      document
        .querySelector<HTMLElement>(`[data-tutorial="${step.target}"]`)
        ?.scrollIntoView({ block: "center", behavior: "instant" });
    }
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [step.target, measure]);

  async function finish() {
    setDone(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ tutorial_completed: true })
      .eq("id", userId);
  }

  function next() {
    if (isLast) {
      void finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  if (done) return null;

  // Faisal + bubble panel: below the spotlight when there is room, above it
  // when the target sits low (e.g. the bottom nav), centered on the intro.
  let panelStyle: React.CSSProperties = {
    top: "50%",
    transform: "translateY(-50%)",
  };
  if (rect) {
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - (rect.top + rect.height);
    if (spaceBelow >= PANEL_MIN_SPACE) {
      panelStyle = { top: rect.top + rect.height + PANEL_GAP };
    } else if (rect.top >= PANEL_MIN_SPACE) {
      panelStyle = { bottom: viewportH - rect.top + PANEL_GAP };
    } else {
      panelStyle = { bottom: 24 };
    }
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Darken everything; the spotlight div below cuts the bright hole via
          its giant box-shadow, so no separate backdrop when a target exists. */}
      {rect ? (
        <div
          className="fixed rounded-2xl pointer-events-none transition-all duration-300"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: "0 0 0 9999px rgba(4, 10, 22, 0.82)",
          }}
        >
          <div className="absolute inset-0 rounded-2xl border-2 border-light-aqua shadow-[0_0_24px_rgba(0,229,255,0.45)]" />
          <div className="absolute inset-0 rounded-2xl border-2 border-light-aqua tutorial-wave" />
          <div className="absolute inset-0 rounded-2xl border-2 border-light-aqua tutorial-wave tutorial-wave-delayed" />
        </div>
      ) : (
        <div className="fixed inset-0 bg-[rgba(4,10,22,0.82)]" />
      )}

      {/* Faisal + chat bubble above his head */}
      <div
        className="fixed left-4 right-4 max-w-md mx-auto"
        style={panelStyle}
      >
        <div key={stepIndex} className="pop-in flex flex-col items-start">
          <div className="w-full bg-surface-card border border-stroke-subtle rounded-3xl shadow-xl p-5">
            <p className="text-body-md text-on-surface">{step.text}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-label-sm font-label-sm text-text-secondary shrink-0">
                {stepIndex + 1} / {STEPS.length}
              </span>
              <div className="flex items-center gap-2">
                {!isLast && (
                  <button
                    type="button"
                    onClick={() => void finish()}
                    className="px-4 py-2 rounded-full text-label-md font-label-md font-semibold text-text-secondary hover:bg-surface-container transition"
                  >
                    Lewati
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary-container text-white text-label-md font-label-md font-semibold shadow-soft active:scale-95 transition"
                >
                  {isLast ? "Selesai" : "Lanjut"}
                  <span className="material-symbols-outlined text-[18px]">
                    {isLast ? "check" : "arrow_forward"}
                  </span>
                </button>
              </div>
            </div>
          </div>
          {/* Bubble tail pointing down at Faisal */}
          <div className="w-4 h-4 bg-surface-card border-b border-r border-stroke-subtle rotate-45 -mt-2 ml-12" />
          <FaisalAvatar
            expression={step.sticker}
            size={96}
            className="mt-1 ml-4 drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)]"
          />
        </div>
      </div>
    </div>
  );
}
