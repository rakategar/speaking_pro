import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Horizontal Speaking Pro lockup (public/logo-header.png, uploaded 2026-07-19).
 * Intrinsic aspect ratio ~892x230; className controls height, width auto.
 */
export function LogoHorizontal({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-header.png"
      alt="Speaking Pro"
      width={892}
      height={230}
      priority
      className={cn("h-7 w-auto object-contain", className)}
    />
  );
}
