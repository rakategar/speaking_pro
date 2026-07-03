type CircularProgressProps = {
  value: number; // 0-100
  color?: string;
  label?: string;
  size?: number;
};

/**
 * SVG stroke-dasharray progress ring, ported 1:1 from rapor_analisis'
 * Confidence/Clarity rings (viewBox 0 0 36 36, stroke-dasharray "{value},100").
 */
export function CircularProgress({
  value,
  color = "#00A3FF",
  label,
  size = 64,
}: CircularProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="circular-chart w-full h-full" viewBox="0 0 36 36">
          <path
            className="circle-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="circle animate-progress"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            stroke={color}
            strokeDasharray={`${clamped}, 100`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-title-lg text-title-lg text-primary">
            {clamped}
          </span>
        </div>
      </div>
      {label ? (
        <p className="font-label-sm text-label-sm text-text-secondary mt-3 uppercase tracking-wider">
          {label}
        </p>
      ) : null}
    </div>
  );
}
