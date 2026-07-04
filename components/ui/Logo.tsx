import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Speaking Pro mark (public/logo.png, uploaded 2026-07-04).
 * Intrinsic aspect ratio ~362x413; className controls height, width auto.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="Speaking Pro"
      width={362}
      height={413}
      priority
      className={cn("size-16 object-contain", className)}
    />
  );
}
