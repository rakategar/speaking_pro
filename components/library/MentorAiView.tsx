"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MODULE_META, difficultyColor } from "@/lib/modules";
import { fallbackReason, type MentorPick } from "@/lib/mentor/plan";
import type { MentorModule } from "@/lib/mentor/service";
import type { MentorNote } from "@/lib/gemini/mentor-note";
import { FaisalAvatar, type FaisalExpression } from "@/components/ui/FaisalAvatar";
import { UpgradeNudgeModal } from "@/components/trial/UpgradeNudgeModal";
import { cn } from "@/lib/utils";

export type MentorCard = MentorPick & {
  module: MentorModule | null;
  locked: boolean;
};

const REASON_BADGE: Record<MentorPick["reason"], string> = {
  next_step: "Dari rapor terakhir",
  weak_signal: "Area terlemah",
  balanced: "Menjaga keseimbangan",
};

/** "Kejelasan artikulasi 58/100" or "Kata pengisi 9x (batas 5)". */
function evidenceLabel(pick: MentorPick): string | null {
  if (!pick.evidence) return null;
  const { metric, value, threshold, direction } = pick.evidence;
  return direction === "below"
    ? `${metric} ${value}/${threshold}`
    : `${metric} ${value} (batas ${threshold})`;
}

export function MentorAiView({
  cards,
  cachedNote,
  latestScore,
  reportedAtLabel,
  hasReport,
}: {
  cards: MentorCard[];
  cachedNote: MentorNote | null;
  latestScore: number | null;
  reportedAtLabel: string | null;
  hasReport: boolean;
}) {
  const [note, setNote] = useState<MentorNote | null>(cachedNote);
  // Only ever true on a first visit for a brand new report -- afterwards the
  // note comes from mentor_plans and this component never calls the API.
  const [loading, setLoading] = useState(cachedNote === null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (cachedNote !== null) return;
    let active = true;
    fetch("/api/mentor", { method: "POST" })
      .then((r) => r.json())
      .then((data: { note: MentorNote | null }) => {
        if (!active) return;
        if (data.note) setNote(data.note);
        setLoading(false);
      })
      .catch(() => {
        // The cards below already carry template copy; silence is the right
        // failure mode here, not an error banner over working content.
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cachedNote]);

  const noteFor = (slug: string) => note?.picks.find((p) => p.slug === slug);

  const expression: FaisalExpression =
    latestScore === null
      ? "inviting-mic"
      : latestScore >= 85
        ? "celebrating"
        : latestScore >= 65
          ? "approve-mic"
          : "tip-mic";

  return (
    <section className="flex flex-col gap-bento-gap">
      {/* Mentor header */}
      <div className="flex items-center gap-4 rounded-3xl border border-stroke-subtle bg-surface-container-lowest p-5 shadow-soft">
        <FaisalAvatar expression={expression} size={64} className="shrink-0" />
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-wider text-secondary-container">
            Mentor AI
          </span>
          <h1 className="font-heading text-xl font-bold text-primary-container">
            {hasReport ? "Rencana latihan Anda" : "Mari mulai dari sini"}
          </h1>
          <p className="mt-0.5 text-xs text-text-secondary">
            {hasReport && reportedAtLabel
              ? `Disusun dari rapor analisis ${reportedAtLabel}.`
              : "Rekam sesi pertama Anda agar mentor bisa membaca kekuatan dan kelemahan asli Anda."}
          </p>
        </div>
      </div>

      {/* Diagnosis */}
      <div className="rounded-3xl border border-stroke-subtle bg-surface-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-brand-cyan">
            psychology
          </span>
          <h2 className="font-title-md text-title-md text-primary">Kata Mentor</h2>
        </div>

        {loading && !note ? (
          <div className="space-y-2" aria-live="polite" aria-busy="true">
            <div className="h-3 w-full animate-pulse rounded-full bg-surface-container" />
            <div className="h-3 w-11/12 animate-pulse rounded-full bg-surface-container" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface-container" />
            <p className="pt-1 text-xs text-text-secondary">
              Mentor sedang membaca hasil latihan Anda…
            </p>
          </div>
        ) : (
          <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
            {note?.diagnosis ||
              (hasReport
                ? "Tiga modul di bawah dipilih langsung dari angka rapor terakhir Anda — mulai dari yang paling atas."
                : "Belum ada rapor untuk dibaca. Tiga modul di bawah adalah fondasi yang aman untuk memulai.")}
          </p>
        )}

        {/* Evidence chips: the numbers that produced these picks. */}
        <div className="mt-4 flex flex-wrap gap-2">
          {cards.map((c) => {
            const label = evidenceLabel(c);
            if (!label) return null;
            return (
              <span
                key={`ev-${c.slug}`}
                className="rounded-full border border-stroke-subtle bg-surface-container px-3 py-1 font-label-sm text-label-sm text-text-secondary"
              >
                {label}
              </span>
            );
          })}
        </div>
      </div>

      {/* The three picks */}
      <div className="flex flex-col gap-bento-gap">
        {cards.map((card, i) => {
          const meta = MODULE_META[card.slug];
          const title = card.module?.title ?? card.slug;
          const why = noteFor(card.slug)?.why || fallbackReason(card);
          const focus = noteFor(card.slug)?.focus;
          const hero = i === 0;

          const inner = (
            <>
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
                    hero ? "bg-white/10" : "bg-surface-container-low",
                  )}
                >
                  {!hero && <div className="absolute inset-0 bg-brand-cyan/10" />}
                  <span
                    className={cn(
                      "material-symbols-outlined relative z-10 text-[28px]",
                      hero ? "text-light-aqua" : "text-primary",
                    )}
                  >
                    {card.locked ? "lock" : (meta?.icon ?? "mic")}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 font-label-sm text-label-sm",
                        hero
                          ? "border border-brand-cyan/30 bg-brand-cyan/20 text-brand-aqua"
                          : "bg-surface-container text-text-secondary",
                      )}
                    >
                      {i + 1}. {REASON_BADGE[card.reason]}
                    </span>
                    {card.locked && (
                      <span className="rounded-full bg-secondary-fixed/40 px-2.5 py-0.5 font-label-sm text-label-sm text-secondary">
                        Terkunci
                      </span>
                    )}
                  </div>

                  <h3
                    className={cn(
                      "font-heading text-lg font-bold leading-tight",
                      hero ? "text-on-primary" : "text-primary",
                    )}
                  >
                    {title}
                  </h3>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span
                      className={cn(
                        "font-label-sm text-label-sm",
                        hero ? "text-inverse-primary" : "text-text-secondary",
                      )}
                    >
                      {card.category}
                    </span>
                    {card.module && (
                      <>
                        <span
                          className={cn(
                            "font-label-sm text-label-sm",
                            hero ? "text-inverse-primary" : "text-text-secondary",
                          )}
                        >
                          {card.module.duration_minutes} menit
                        </span>
                        <span
                          className={cn(
                            "font-label-sm text-[11px]",
                            hero
                              ? "text-inverse-primary"
                              : difficultyColor(card.module.difficulty),
                          )}
                        >
                          {card.module.difficulty}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <p
                className={cn(
                  "mt-4 font-body-md text-body-md leading-relaxed",
                  hero ? "text-inverse-primary" : "text-on-surface-variant",
                )}
              >
                {why}
              </p>

              {focus && (
                <p
                  className={cn(
                    "mt-2 flex items-start gap-1.5 font-label-sm text-label-sm",
                    hero ? "text-brand-aqua" : "text-secondary",
                  )}
                >
                  <span className="material-symbols-outlined text-[16px]">target</span>
                  <span>{focus}</span>
                </p>
              )}

              <span
                className={cn(
                  "mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 font-label-md text-label-md transition-opacity",
                  hero
                    ? "bg-brand-cyan text-white shadow-[0_4px_14px_rgba(0,163,255,0.39)]"
                    : "border border-stroke-subtle bg-surface-container-low text-primary",
                )}
              >
                {card.locked ? "Lihat cara membuka" : "Mulai Latihan"}
                <span
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {card.locked ? "lock_open" : "play_arrow"}
                </span>
              </span>
            </>
          );

          const shell = cn(
            "relative overflow-hidden rounded-3xl p-5 text-left shadow-soft transition-transform active:scale-[0.99]",
            hero
              ? "bg-gradient-to-br from-primary-container to-[#003558]"
              : "border border-stroke-subtle bg-surface-card",
          );

          // A locked module stays visible as a recommendation: it was chosen
          // from the user's own scores, so it is the most honest upgrade
          // prompt the app has.
          if (card.locked) {
            return (
              <button
                key={card.slug}
                type="button"
                onClick={() => setShowUpgrade(true)}
                className={cn(shell, "w-full")}
              >
                {hero && (
                  <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-cyan/20 blur-3xl" />
                )}
                <div className="relative z-10">{inner}</div>
              </button>
            );
          }

          return (
            <Link
              key={card.slug}
              href={meta?.route ?? `/library/${card.slug}`}
              className={cn(shell, "block")}
            >
              {hero && (
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-cyan/20 blur-3xl" />
              )}
              <div className="relative z-10">{inner}</div>
            </Link>
          );
        })}
      </div>

      {/* Weekly target */}
      {note?.weekly_target && (
        <div className="rounded-3xl border border-l-4 border-stroke-subtle border-l-brand-cyan bg-surface-card p-5 shadow-soft">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-brand-cyan">
              flag
            </span>
            <h2 className="font-title-md text-title-md text-primary">Target Minggu Ini</h2>
          </div>
          <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
            {note.weekly_target}
          </p>
        </div>
      )}

      {/* Where these picks come from -- and where to see the full picture. */}
      <Link
        href="/progress"
        className="flex items-center gap-3 rounded-3xl border border-stroke-subtle bg-surface-card p-4 shadow-soft transition-colors hover:border-brand-cyan/50"
      >
        <span className="material-symbols-outlined text-secondary-container">
          monitoring
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary">Analisis Menyeluruh</p>
          <p className="text-xs text-text-secondary">
            Lihat perjalanan Anda dari sesi pertama sampai terakhir.
          </p>
        </div>
        <span className="material-symbols-outlined text-text-secondary">
          chevron_right
        </span>
      </Link>

      {showUpgrade && (
        <UpgradeNudgeModal
          variant="soft"
          body="Modul ini dipilih dari hasil analisis Anda sendiri, tapi masih terkunci di masa trial. Upgrade ke Premium untuk membukanya sekarang."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </section>
  );
}
