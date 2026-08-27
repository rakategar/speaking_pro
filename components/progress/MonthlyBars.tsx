import type { MonthBucket } from "@/lib/progress/analytics";

/** Monthly activity: bar height = sessions, label = average score that month. */
export function MonthlyBars({ months }: { months: MonthBucket[] }) {
  const peak = Math.max(1, ...months.map((m) => m.sessions + m.drills));

  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-1">
      {months.map((m) => {
        const total = m.sessions + m.drills;
        const height = Math.max(4, Math.round((total / peak) * 96));
        return (
          <div key={m.month} className="flex min-w-[44px] flex-1 flex-col items-center gap-1.5">
            <span className="font-label-sm text-[11px] tabular-nums text-on-surface-variant">
              {m.avgOverall === null ? "–" : Math.round(m.avgOverall)}
            </span>
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-[#00A2FD] to-[#00E5FF]"
              style={{ height: `${height}px` }}
              title={`${m.label}: ${m.sessions} sesi, ${m.drills} drill, ${m.minutes} menit`}
            />
            <span className="font-label-sm text-[11px] text-text-secondary">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}
