"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

// Shared back-navigation behaviour for TopAppBar and BackButton, which had
// drifted into two copies of the same logic.
//
// The double-tap guard exists because a second tap fired before the first
// router.back() resolves queues a second history pop and skips past the page
// the user meant to land on. But every page here is force-dynamic, so a back
// navigation waits on a Supabase round-trip -- long enough that the guard
// would latch on and, since nothing ever cleared it, leave the button dead
// for good whenever the navigation was slow, interrupted, or cancelled.
//
// So the guard is released two ways: when the route actually changes, and via
// a timeout in case the navigation never lands. `navigating` is returned so
// the button can show it registered the tap instead of looking broken while
// the server responds.
const GUARD_RELEASE_MS = 1500;

export function useGoBack(disabled = false) {
  const router = useRouter();
  const pathname = usePathname();
  const navigatingRef = useRef(false);
  const timeoutRef = useRef<number | undefined>(undefined);
  const [navigating, setNavigating] = useState(false);

  const release = useCallback(() => {
    navigatingRef.current = false;
    setNavigating(false);
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  }, []);

  // The navigation landed -- let the button accept taps again.
  useEffect(() => {
    release();
  }, [pathname, release]);

  useEffect(() => release, [release]);

  const goBack = useCallback(() => {
    if (disabled || navigatingRef.current) return;
    navigatingRef.current = true;
    setNavigating(true);
    timeoutRef.current = window.setTimeout(release, GUARD_RELEASE_MS);

    // router.back() is a no-op when this is the first history entry (PWA
    // launch, push notification, deep link) -- fall back to the dashboard so
    // the button always does something.
    if (window.history.length > 1) router.back();
    else router.push("/dashboard");
  }, [disabled, release, router]);

  return { goBack, navigating };
}
