"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Rendered inside RootLayout, so it lives on the initial HTML response and is
// already visible at first paint -- no flash of the app underneath before it
// appears. Stays up briefly, then fades out once; RootLayout persists across
// client-side navigations, so this never re-mounts on route changes.
const HOLD_MS = 650;
const FADE_MS = 350;

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), HOLD_MS);
    const hideTimer = setTimeout(() => setVisible(false), HOLD_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-white transition-opacity duration-[350ms] ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <Image
        src="/splash-logo.png"
        alt=""
        width={640}
        height={385}
        priority
        className="w-44 h-auto sm:w-56"
      />
    </div>
  );
}
