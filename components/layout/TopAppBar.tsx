"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

type TopAppBarProps = {
  variant: "home" | "back" | "transactional";
  title: string;
  avatarUrl?: string;
  onNotificationClick?: () => void;
  className?: string;
  /** Disable the back button (e.g. while an upload is in flight). */
  backDisabled?: boolean;
  /** Hide the back arrow on "back"/"transactional" (bottom-tab roots have nowhere to go "back" to). */
  showBack?: boolean;
  /** "home" only: small line above `title` (e.g. a time-of-day greeting). */
  subtitle?: string;
  /** "home" only: wraps the avatar+title block in a Link (e.g. to /profile). */
  avatarHref?: string;
  /** "home" only: single-letter fallback shown when there's no avatarUrl. */
  avatarFallback?: string;
};

/**
 * One fixed/blurred bar shape reused across every screen; only the
 * left/center content differs per mockup:
 *  - "home": avatar + greeting title + notification bell (Dashboard, Rapor)
 *  - "back": back button + left-aligned title + notification bell (AIUEO, Account, Pro Shop)
 *  - "transactional": back button + centered title + spacer, no bell (Checkout)
 */
export function TopAppBar({
  variant,
  title,
  avatarUrl,
  onNotificationClick,
  className,
  backDisabled = false,
  showBack = true,
  subtitle,
  avatarHref,
  avatarFallback,
}: TopAppBarProps) {
  const router = useRouter();

  // router.back() is a no-op when the page is the first history entry
  // (opened from a PWA launch, push notification, or a direct link) --
  // fall back to the dashboard so the button always does something.
  function goBack() {
    if (backDisabled) return;
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl",
        className,
      )}
    >
      {/* Brand strip: same logo, same size/position, on every page. */}
      <div className="flex items-center justify-center py-1.5 border-b border-stroke-subtle/30">
        <Logo className="h-5 w-auto" />
      </div>

      <div className="flex items-center justify-between px-margin-mobile py-4">
        {variant === "home" ? (
          (() => {
            const content = (
              <>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border border-stroke-subtle shrink-0 relative flex items-center justify-center font-heading font-bold text-on-secondary">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" fill className="object-cover" />
                  ) : (
                    (avatarFallback ?? "").charAt(0).toUpperCase()
                  )}
                </div>
                {subtitle ? (
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {subtitle}
                    </span>
                    <h1 className="font-headline-md text-headline-md text-primary m-0">
                      {title}
                    </h1>
                  </div>
                ) : (
                  <h1 className="font-headline-md text-headline-md text-primary m-0">
                    {title}
                  </h1>
                )}
              </>
            );
            return avatarHref ? (
              <Link href={avatarHref} className="flex items-center gap-3">
                {content}
              </Link>
            ) : (
              <div className="flex items-center gap-3">{content}</div>
            );
          })()
        ) : showBack ? (
          <button
            type="button"
            onClick={goBack}
            disabled={backDisabled}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary -ml-2 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Kembali"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : (
          <div className="w-10" />
        )}

        {variant === "transactional" ? (
          <h1 className="font-title-lg text-title-lg text-primary text-center absolute left-1/2 -translate-x-1/2">
            {title}
          </h1>
        ) : null}

        {variant === "back" ? (
          <h1 className="font-title-lg text-title-lg text-primary flex-1 text-center -ml-10">
            {title}
          </h1>
        ) : null}

        {variant === "transactional" ? (
          <div className="w-10" />
        ) : (
          <button
            type="button"
            onClick={onNotificationClick}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary"
            aria-label="Notifikasi"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              notifications
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
