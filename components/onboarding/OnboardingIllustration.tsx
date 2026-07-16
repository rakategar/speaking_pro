import { cn } from "@/lib/utils";
import { FaisalAvatar, type FaisalExpression } from "@/components/ui/FaisalAvatar";

type Tone = "primary" | "secondary" | "tertiary";

const TONE_STYLES: Record<Tone, { blob: string; dot: string }> = {
  primary: {
    blob: "bg-primary-fixed/60",
    dot: "bg-secondary-container",
  },
  secondary: {
    blob: "bg-secondary-fixed/70",
    dot: "bg-tertiary-fixed",
  },
  tertiary: {
    blob: "bg-tertiary-fixed/70",
    dot: "bg-primary-fixed",
  },
};

/**
 * Per-question "illustration": an organic blob (CSS border-radius trick, no
 * image asset) behind a Faisal sticker whose expression matches the
 * question's mood, plus two floating accent dots.
 */
export function OnboardingIllustration({
  sticker,
  tone,
}: {
  sticker: FaisalExpression;
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
      <FaisalAvatar
        expression={sticker}
        size={112}
        className="relative drop-shadow-md"
      />
    </div>
  );
}
