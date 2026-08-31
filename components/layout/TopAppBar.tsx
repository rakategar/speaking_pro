"use client";

import Link from "next/link";
import { LogoHorizontal } from "@/components/ui/LogoHorizontal";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LeaderboardButton } from "@/components/layout/LeaderboardButton";
import { useGoBack } from "@/components/ui/useGoBack";
import { cn } from "@/lib/utils";

type TopAppBarProps = {
  variant: "home" | "back" | "transactional";
  title: string;
  avatarUrl?: string;
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
 *  - "home": avatar + greeting title + trophy/bell (Dashboard, Rapor)
 *  - "back": back button + left-aligned title + trophy/bell (AIUEO, Account, Pro Shop)
 *  - "transactional": back button + centered title + spacer, no actions (Checkout)
 */
export function TopAppBar({
  variant,
  title,
  avatarUrl,
  className,
  backDisabled = false,
  showBack = true,
  subtitle,
  avatarHref,
  avatarFallback,
}: TopAppBarProps) {
  const { goBack, navigating } = useGoBack(backDisabled);

  return (
    <header
      className={cn(
        // inset-x-0 (left:0; right:0), not w-full: TopAppBar is mounted
        // inside each page's own max-w-md/max-w-lg wrapper, and a `fixed`
        // element with `left` left auto falls back to its *static
        // position* -- where it would sit in that narrow, centered parent's
        // flow -- instead of the true viewport edge. w-full alone still
        // made the box the right width, just anchored from that wrong
        // offset, dragging everything inside it off to the right on any
        // screen wider than the wrapper. Pinning left/right explicitly
        // bypasses the static-position fallback entirely.
        "fixed inset-x-0 top-0 z-50 bg-background/80 backdrop-blur-xl",
        className,
      )}
    >
      {/* Brand strip: same logo, same size/position, on every page. */}
      <div className="flex items-center justify-center py-1.5 border-b border-stroke-subtle/30">
        <LogoHorizontal className="h-6 w-auto" />
      </div>

      {/* Capped at the same max-w-lg the bottom nav and every page body use
          (record/history/notifications/summaries) so avatar/title and the
          trophy/bell sit near the content column on wide screens instead of
          pinned to the true browser edges -- mobile viewports are already
          narrower than max-w-lg, so this is a no-op there. */}
      <div className="flex items-center justify-between px-margin-mobile py-4 max-w-lg mx-auto">
        {variant === "home" ? (
          (() => {
            const content = (
              <>
                <UserAvatar
                  src={avatarUrl}
                  name={avatarFallback}
                  size={40}
                  className="border border-stroke-subtle"
                />
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
            aria-busy={navigating}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95 text-primary -ml-2 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Kembali"
          >
            <span
              className={cn(
                "material-symbols-outlined transition-opacity",
                navigating && "opacity-60",
              )}
            >
              arrow_back
            </span>
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
          // -ml-10 pulls the title box back over the 40px back button to
          // optically centre it; without pointer-events-none this later
          // sibling wins hit-testing and swallows clicks on the arrow.
          // -mr-10 is the mirror of that for the trophy that now sits beside
          // the bell: the action group grew by one 40px button, so without it
          // the flex-1 title box would drift left of where it used to sit.
          <h1 className="font-title-lg text-title-lg text-primary flex-1 text-center -ml-10 -mr-10 pointer-events-none">
            {title}
          </h1>
        ) : null}

        {variant === "transactional" ? (
          <div className="w-10" />
        ) : (
          <div className="flex items-center gap-0.5">
            <LeaderboardButton />
            <NotificationBell />
          </div>
        )}
      </div>
    </header>
  );
}
