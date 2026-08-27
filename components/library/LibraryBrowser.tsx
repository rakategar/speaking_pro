"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MODULE_META, difficultyColor } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { UpgradeNudgeModal } from "@/components/trial/UpgradeNudgeModal";

type Module = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  duration_minutes: number;
  is_ai_recommended: boolean;
};

const CATEGORIES = [
  "Semua",
  "Artikulasi",
  "Tempo",
  "Intonasi",
  "Kepercayaan Diri",
  "Filler Words",
  "Struktur",
  "Pernapasan",
  "Simulasi",
];

export function LibraryBrowser({
  modules,
  lockedSlugs = new Set(),
}: {
  modules: Module[];
  lockedSlugs?: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return modules.filter((m) => {
      const matchesCategory = category === "Semua" || m.category === category;
      const matchesQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [modules, query, category]);

  return (
    <>
      {/* Search */}
      <div className="relative w-full mb-4 group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-brand-cyan transition-colors">
          search
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari latihan..."
          className="w-full bg-surface-card border border-stroke-subtle rounded-2xl py-3 pl-12 pr-4 text-body-md text-on-surface placeholder:text-text-secondary focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan shadow-soft transition-all"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-full font-label-md text-label-md transition-colors",
              c === category
                ? "bg-primary text-on-primary"
                : "bg-surface-card text-text-secondary border border-stroke-subtle shadow-soft",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Module list */}
      <div className="flex flex-col gap-bento-gap">
        <h2 className="font-title-lg text-title-lg text-primary mb-1 font-bold">
          Semua Modul
        </h2>
        {filtered.length === 0 && (
          <p className="text-body-md text-text-secondary py-8 text-center">
            Tidak ada latihan yang cocok dengan pencarian Anda.
          </p>
        )}
        {filtered.map((m) => {
          const locked = lockedSlugs.has(m.slug);
          const content = (
            <>
              <div className="w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-brand-cyan/10" />
                <span className="material-symbols-outlined text-primary relative z-10">
                  {locked ? "lock" : (MODULE_META[m.slug]?.icon ?? "mic")}
                </span>
              </div>
              <div className="flex-grow">
                <h4 className="text-[16px] leading-tight text-primary font-semibold mb-1">
                  {m.title}
                </h4>
                <p className="font-label-sm text-label-sm text-text-secondary">
                  {m.category}
                </p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="font-label-sm text-label-sm text-text-secondary bg-surface-container py-1 px-2 rounded-lg mb-1">
                  {m.duration_minutes} Min
                </span>
                <span
                  className={cn(
                    "font-label-sm text-[11px]",
                    difficultyColor(m.difficulty),
                  )}
                >
                  {m.difficulty}
                </span>
              </div>
            </>
          );

          if (locked) {
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="bg-surface-card rounded-2xl p-4 flex items-center gap-4 shadow-soft border border-stroke-subtle opacity-70 transition-colors group text-left"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={m.id}
              href={`/library/${m.slug}`}
              className="bg-surface-card rounded-2xl p-4 flex items-center gap-4 shadow-soft border border-stroke-subtle hover:border-brand-cyan/50 transition-colors group"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {showUpgrade && (
        <UpgradeNudgeModal
          variant="soft"
          body="Modul ini terbuka bertahap selama masa trial. Upgrade ke Premium untuk membuka seluruh modul sekaligus."
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </>
  );
}
