import Image from "next/image";
import { cn } from "@/lib/utils";

// Faisal is Speaking Pro's mascot/coach avatar. Each expression is a
// standalone sticker (public/stickers/faisal/), picked per-screen to match
// the emotional beat of that moment (celebrating a good score, waiting
// during analysis, nudging an upgrade, etc).
const EXPRESSIONS = {
  "thumbs-up": "/stickers/faisal/thumbs-up.png",
  cheering: "/stickers/faisal/cheering.png",
  "finger-heart": "/stickers/faisal/finger-heart.png",
  "thinking-idea": "/stickers/faisal/thinking-idea.png",
  confused: "/stickers/faisal/confused.png",
  doubtful: "/stickers/faisal/doubtful.png",
  celebrating: "/stickers/faisal/celebrating.png",
  laughing: "/stickers/faisal/laughing.png",
  analyzing: "/stickers/faisal/analyzing.png",
  "speaking-confident": "/stickers/faisal/speaking-confident.png",
  "cheering-mic": "/stickers/faisal/cheering-mic.png",
  "waving-mic": "/stickers/faisal/waving-mic.png",
  "tip-mic": "/stickers/faisal/tip-mic.png",
  "approve-mic": "/stickers/faisal/approve-mic.png",
  "smug-mic": "/stickers/faisal/smug-mic.png",
} as const;

export type FaisalExpression = keyof typeof EXPRESSIONS;

export function FaisalAvatar({
  expression,
  size = 96,
  className,
  priority,
}: {
  expression: FaisalExpression;
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={EXPRESSIONS[expression]}
      alt="Faisal"
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none object-contain", className)}
    />
  );
}
