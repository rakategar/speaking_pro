"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Module-scope singleton (survives across every template.tsx remount, only
// initialized once per page load): the browser back/forward buttons and
// router.back() fire a native popstate event we can't get any other way in
// the App Router. A forward navigation (Link/router.push) never fires it,
// so "forward" is the correct default the rest of the time.
let pendingDirection: "forward" | "back" = "forward";
if (typeof window !== "undefined") {
  window.addEventListener(
    "popstate",
    () => {
      pendingDirection = "back";
    },
    { passive: true },
  );
}

/**
 * Wraps a route group's template.tsx children. Next.js remounts template.tsx
 * on every navigation by design, so the lazy useState initializer below runs
 * exactly once per navigation, capturing (and resetting) whatever direction
 * was pending at that moment.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [direction] = useState(() => {
    const d = pendingDirection;
    pendingDirection = "forward";
    return d;
  });

  return (
    <div
      className={cn(
        direction === "back" ? "page-slide-back" : "page-slide-fwd",
        className,
      )}
    >
      {children}
    </div>
  );
}
