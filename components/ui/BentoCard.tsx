import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type BentoCardProps<T extends ElementType> = {
  as?: T;
  tone?: "light" | "dark";
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className">;

/**
 * Shared Bento module primitive: rounded-3xl card with the soft blue
 * ambient shadow used across every mockup ("Modern Bento Grid" per
 * design-reference/speaking_pro_corporate_identity/DESIGN.md).
 * tone="dark" reproduces the Deep Navy hero cards (Overall Score,
 * Next Steps, Pro Shop 1-on-1) including their inner white border glow.
 */
export function BentoCard<T extends ElementType = "div">({
  as,
  tone = "light",
  className,
  children,
  ...props
}: BentoCardProps<T>) {
  const Component = as || "div";
  return (
    <Component
      className={cn(
        "rounded-3xl p-6 shadow-soft",
        tone === "light" &&
          "bg-surface-card border border-stroke-subtle text-on-surface",
        tone === "dark" &&
          "bg-primary-container border border-white/10 text-on-primary",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
