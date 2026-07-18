import Image from "next/image";
import { cn } from "@/lib/utils";

// Faisal is Speaking Pro's mascot/coach avatar. Each expression is a
// standalone sticker (public/stickers/faisal-v2/), picked per-screen to match
// the emotional beat of that moment (celebrating a good score, waiting
// during analysis, nudging an upgrade, etc).
const EXPRESSIONS = {
  "thumbs-up": "/stickers/faisal-v2/thumbs-up.png",
  cheering: "/stickers/faisal-v2/cheering.png",
  "finger-heart": "/stickers/faisal-v2/finger-heart.png",
  "thinking-idea": "/stickers/faisal-v2/thinking-idea.png",
  confused: "/stickers/faisal-v2/confused.png",
  doubtful: "/stickers/faisal-v2/doubtful.png",
  celebrating: "/stickers/faisal-v2/celebrating.png",
  laughing: "/stickers/faisal-v2/laughing.png",
  analyzing: "/stickers/faisal-v2/analyzing.png",
  "speaking-confident": "/stickers/faisal-v2/speaking-confident.png",
  "cheering-mic": "/stickers/faisal-v2/cheering-mic.png",
  "waving-mic": "/stickers/faisal-v2/waving-mic.png",
  "tip-mic": "/stickers/faisal-v2/tip-mic.png",
  "approve-mic": "/stickers/faisal-v2/approve-mic.png",
  "smug-mic": "/stickers/faisal-v2/smug-mic.png",
  "inviting-mic": "/stickers/faisal-v2/inviting-mic.png",
  "puzzled-mic": "/stickers/faisal-v2/puzzled-mic.png",
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
