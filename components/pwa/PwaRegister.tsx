"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js on every page load so the PWA works (offline fallback,
 * asset cache) even before the user enables push notifications. EnablePush
 * reuses the same registration.
 *
 * Also flips the `fonts-loaded` class once the Material Symbols font is
 * ready, so icon glyphs fade in instead of flashing their ligature names
 * (see globals.css).
 */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    document.fonts
      .load('24px "Material Symbols Outlined"')
      .catch(() => {})
      .finally(() =>
        document.documentElement.classList.add("fonts-loaded"),
      );
  }, []);
  return null;
}
