import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ChipProps = {
  active?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Pill-shaped filter/selector chip: category filters in Practice Library,
 * environment selector in Recording Studio.
 */
export function Chip({ active, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "px-4 py-1.5 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-colors",
        active
          ? "bg-primary-container text-on-primary shadow-sm"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
