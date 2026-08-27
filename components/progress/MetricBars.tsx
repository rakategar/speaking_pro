import type { MetricTrend } from "@/lib/progress/analytics";
import { cn } from "@/lib/utils";

const n = (v: number) => (Math.round(v * 10) / 10).toLocaleString("id-ID");

/**
 * Lifetime average vs the last five sessions, one row per metric.
 *
 * Plain divs rather than a chart: Chart.js would need BarElement registered
 * (see components/report/TrendChart.tsx, which registers only the line parts)
 * and a bar per metric is not worth a canvas.
 */
export function MetricBars({ trends }: { trends: MetricTrend[] }) {
  return (
    <div className="flex flex-col gap-5">
      {trends.map((t) => {
        const lifetimePct = t.lifetime === null ? 0 : Math.min(100, (t.lifetime / t.max) * 100);
        const recentPct = t.recent === null ? 0 : Math.min(100, (t.recent / t.max) * 100);
        const improving =
          t.delta === null ? null : t.higherIsBetter ? t.delta > 0 : t.delta < 0;

        return (
          <div key={t.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="font-label-md text-label-md text-primary">{t.label}</span>
              <span className="font-label-sm text-label-sm tabular-nums text-on-surface-variant">
                {t.recent === null ? "--" : n(t.recent)}
                {t.delta !== null && t.delta !== 0 && (
                  <span
                    className={cn(
                      "ml-2",
                      improving ? "text-emerald-600" : "text-orange-500",
                    )}
                  >
                    {t.delta > 0 ? "+" : ""}
                    {n(t.delta)}
                  </span>
                )}
              </span>
            </div>

            {/* Recent on top of lifetime: the gap between the two bars IS the
                progress, so they share one track rather than sitting apart. */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-container">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary-container/30"
                style={{ width: `${Math.max(lifetimePct, 1)}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#00A2FD] to-[#00E5FF]"
                style={{ width: `${Math.max(recentPct, 1)}%` }}
              />
            </div>

            <p className="mt-1 font-label-sm text-[11px] text-text-secondary">
              Seumur waktu {t.lifetime === null ? "--" : n(t.lifetime)}
              {t.key === "wpm" && " kata/menit"}
              {t.key === "filler" && " per sesi"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
