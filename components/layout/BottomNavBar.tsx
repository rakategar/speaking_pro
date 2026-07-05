"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", icon: "home", label: "Home" },
  { href: "/library", icon: "menu_book", label: "Library" },
  { href: "/record", icon: "mic", label: "Record" },
  { href: "/profile", icon: "person", label: "Profile" },
] as const;

/**
 * Standardized 4-tab glassmorphic floating nav (Home/Library/Record/Profile).
 * Rendered only from (tabs)/layout.tsx -- suppressed on recording, breathing,
 * checkout and pro-shop routes per the original mockups' explicit
 * "BottomNavBar is intentionally SUPPRESSED" convention for linear/
 * transactional flows, enforced here by the (focus) route group simply
 * never mounting this component.
 */
export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-40px)] max-w-lg rounded-full backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,163,255,0.2)] z-50 flex justify-around items-center px-6 py-2 bg-primary-container">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center justify-center p-3 rounded-full transition-all duration-300 ease-out active:scale-90",
              active
                ? "bg-secondary-container text-on-primary shadow-[0_0_20px_rgba(0,163,255,0.6)]"
                : "text-on-primary/60 hover:bg-white/10",
            )}
            aria-label={tab.label}
          >
            <span
              className={cn(
                "material-symbols-outlined transition-transform duration-300 ease-out",
                active && "scale-110",
              )}
              style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
