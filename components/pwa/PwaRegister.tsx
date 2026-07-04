"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js on every page load so the PWA works (offline fallback,
 * asset cache) even before the user enables push notifications. EnablePush
 * reuses the same registration.
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
