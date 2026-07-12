import { cn } from "@/lib/utils";

type Tone = "primary" | "secondary" | "tertiary";

const TONE_STYLES: Record<
  Tone,
  { blob: string; iconBg: string; iconColor: string; dot: string }
> = {
  primary: {
    blob: "bg-primary-fixed/60",
    iconBg: "bg-primary-container",
    iconColor: "text-on-primary",
    dot: "bg-secondary-container",
  },
  secondary: {
    blob: "bg-secondary-fixed/70",
    iconBg: "bg-secondary-container",
    iconColor: "text-on-secondary",
    dot: "bg-tertiary-fixed",
  },
  tertiary: {
    blob: "bg-tertiary-fixed/70",
    iconBg: "bg-tertiary-container",
    iconColor: "text-on-tertiary",
    dot: "bg-primary-fixed",
  },
};

/**
 * Lightweight per-question "illustration": an organic blob (CSS border-radius
 * trick, no image asset) behind a Material Symbols icon in a colored disc,
 * plus two floating accent dots. Reuses the app's existing token palette so
 * it reads as part of the same design system instead of a bolted-on asset.
 */
export function OnboardingIllustration({
  icon,
  tone,
}: {
  icon: string;
  tone: Tone;
}) {
  const s = TONE_STYLES[tone];
  return (
    <div className="relative mx-auto mb-6 flex h-36 w-36 items-center justify-center">
      <div
        className={cn("absolute inset-0", s.blob)}
        style={{ borderRadius: "42% 58% 63% 37% / 41% 44% 56% 59%" }}
      />
      <span
        className={cn("absolute -top-1 right-3 h-4 w-4 rounded-full", s.dot)}
      />
      <span
        className={cn("absolute bottom-2 -left-2 h-3 w-3 rounded-full", s.dot)}
      />
      <div
        className={cn(
          "relative flex h-20 w-20 items-center justify-center rounded-full shadow-soft",
          s.iconBg,
        )}
      >
        <span className={cn("material-symbols-outlined text-[40px]", s.iconColor)}>
          {icon}
        </span>
      </div>
    </div>
  );
}
