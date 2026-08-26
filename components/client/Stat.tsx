export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "warn" | "good";
}) {
  const color =
    tone === "warn"
      ? "text-orange-500"
      : tone === "good"
        ? "text-emerald-600"
        : "text-primary";
  return (
    <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
      <p className="text-label-sm font-semibold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}
