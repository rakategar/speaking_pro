"use client";

import { cn } from "@/lib/utils";

type SoundwaveProps = {
  /** 7 normalized levels 0..1 from useRecorder; omit for the idle CSS loop */
  levels?: number[];
  active?: boolean;
  className?: string;
};

/**
 * The 7-bar soundwave visual from the mockups. With `levels` it renders
 * live mic amplitude; without, it falls back to the decorative CSS
 * `soundwave` keyframe loop (used on idle/marketing surfaces).
 */
export function Soundwave({ levels, active = true, className }: SoundwaveProps) {
  if (!levels) {
    return (
      <div className={cn("flex items-center h-12", className)}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="bar" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center h-12 gap-1", className)}>
      {levels.map((level, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-current transition-[height] duration-75"
          style={{ height: `${8 + (active ? level : 0.08) * 40}px` }}
        />
      ))}
    </div>
  );
}
