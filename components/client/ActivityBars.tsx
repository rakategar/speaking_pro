type Day = { date: string; sessions: number; drills: number; minutes: number };

const fmt = (iso: string) =>
  new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });

/**
 * Minutes practised per day. Plain divs rather than Chart.js: this is one
 * series of small non-negative numbers, and a chart library would be a
 * client bundle for something CSS already does.
 */
export function ActivityBars({ daily }: { daily: Day[] }) {
  const max = Math.max(1, ...daily.map((d) => d.minutes));
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-full items-end gap-[3px]" style={{ height: 110 }}>
        {daily.map((d) => {
          const height = d.minutes === 0 ? 2 : Math.max(4, (d.minutes / max) * 100);
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              style={{ minWidth: 6 }}
              title={`${fmt(d.date)}: ${d.minutes} menit · ${d.sessions} sesi · ${d.drills} drill`}
            >
              <div
                className={
                  d.minutes === 0
                    ? "w-full rounded-sm bg-stroke-subtle"
                    : "w-full rounded-sm bg-secondary-container"
                }
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-text-secondary">
        <span>{daily.length > 0 ? fmt(daily[0].date) : ""}</span>
        <span>{daily.length > 0 ? fmt(daily[daily.length - 1].date) : ""}</span>
      </div>
    </div>
  );
}
