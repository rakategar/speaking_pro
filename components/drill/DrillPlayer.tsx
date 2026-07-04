"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TopAppBar } from "@/components/layout/TopAppBar";
import type { DrillConfig } from "@/lib/drills/content";
import {
  BlankSpaceEngine,
  ComparisonEngine,
  EmphasisTextEngine,
  EnergyTabsEngine,
  StructureBoxesEngine,
  ToneTextEngine,
  WordHighlightEngine,
} from "./TextEngines";
import {
  CountdownAffirmationEngine,
  MetronomeEngine,
  WizardEngine,
} from "./TimingEngines";
import { LocalRecordEngine } from "./RecordEngines";
import { cn } from "@/lib/utils";

function EngineView({ config }: { config: DrillConfig }) {
  const e = config.engine;
  switch (e.kind) {
    case "word-highlight":
      return <WordHighlightEngine engine={e} />;
    case "local-record":
      return <LocalRecordEngine engine={e} />;
    case "metronome":
      return <MetronomeEngine engine={e} />;
    case "countdown-affirmation":
      return <CountdownAffirmationEngine engine={e} />;
    case "wizard":
      return <WizardEngine engine={e} />;
    case "tone-text":
      return <ToneTextEngine segments={e.segments} />;
    case "emphasis-text":
      return <EmphasisTextEngine segments={e.segments} />;
    case "energy-tabs":
      return <EnergyTabsEngine engine={e} />;
    case "blank-space":
      return <BlankSpaceEngine engine={e} />;
    case "structure-boxes":
      return <StructureBoxesEngine engine={e} />;
    case "comparison":
      return <ComparisonEngine engine={e} />;
  }
}

/**
 * Shared shell for every client-side daily drill: session timer toward the
 * drill's recommended duration, the interactive engine, and a completion
 * log via /api/drills/complete (same endpoint the legacy drills use) so the
 * practiced minutes count toward the 10-minute daily goal and the streak.
 */
export function DrillPlayer({ config }: { config: DrillConfig }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const elapsedRef = useRef(0);

  // Count practice time only while the tab is visible.
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [finished]);

  async function complete() {
    setSaving(true);
    try {
      await fetch("/api/drills/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleSlug: config.slug,
          durationSeconds: elapsedRef.current,
        }),
      });
    } finally {
      setSaving(false);
      setFinished(true);
    }
  }

  const goalPct = Math.min(100, Math.round((elapsed / config.goalSeconds) * 100));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (finished) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <TopAppBar variant="back" title={config.title} />
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
              {Math.max(1, Math.round(elapsedRef.current / 60))} menit latihan
              tercatat dan dihitung ke target harian 10 menit Anda.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full bg-secondary-container text-on-secondary rounded-full py-3.5 font-semibold shadow-md active:scale-95 transition"
            >
              Lihat Progress Harian
            </button>
            <button
              type="button"
              onClick={() => router.push("/library")}
              className="w-full border border-outline-variant text-on-surface rounded-full py-3.5 font-semibold active:scale-95 transition"
            >
              Latihan Lainnya
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <TopAppBar variant="back" title={config.title} />
      <main className="pt-24 px-margin-mobile max-w-2xl mx-auto flex flex-col gap-bento-gap">
        {/* Session timer + goal */}
        <div className="bg-white rounded-3xl border border-stroke-subtle shadow-soft p-4 flex items-center gap-4">
          <span className="font-heading font-extrabold text-[26px] text-primary tabular-nums shrink-0">
            {mm}:{ss}
          </span>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex justify-between text-label-sm font-label-sm text-text-secondary">
              <span>Sesi latihan</span>
              <span>
                target {Math.round(config.goalSeconds / 60)} mnt · {goalPct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-container overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  goalPct >= 100 ? "bg-[#00daf3]" : "bg-secondary-container",
                )}
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* What & how */}
        <div className="bg-primary-container rounded-3xl p-5 flex flex-col gap-3">
          <p className="text-on-primary-container text-body-md leading-relaxed">
            {config.tagline}
          </p>
          <ul className="flex flex-col gap-1.5">
            {config.instructions.map((step, i) => (
              <li
                key={i}
                className="flex gap-2 text-label-md font-label-md text-primary-fixed-dim"
              >
                <span className="text-[#00e5ff] font-bold shrink-0">
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        <EngineView config={config} />

        <button
          type="button"
          onClick={complete}
          disabled={saving || elapsed < 30}
          className="py-4 rounded-full bg-secondary-container text-on-secondary font-semibold shadow-md active:scale-95 transition disabled:opacity-50"
        >
          {saving
            ? "Menyimpan..."
            : elapsed < 30
              ? "Berlatih dulu minimal 30 detik"
              : "Selesai — Catat Latihan"}
        </button>
      </main>
    </div>
  );
}
