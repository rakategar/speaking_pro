"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Status = "idle" | "installing" | "installed" | "unavailable";

/**
 * Target of the landing page's Download buttons. beforeinstallprompt only
 * fires on this origin, so the marketing site can't trigger install
 * directly -- it links here instead, where a real user gesture on the
 * primary button can call .prompt(). If the browser never fires the event
 * (iOS Safari, Firefox, or the outcome is "dismissed"), the fallback button
 * below just continues into the regular site.
 */
export function InstallLanding() {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      window.location.replace("/dashboard");
      return;
    }
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setStatus("installed");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) {
      setStatus("unavailable");
      return;
    }
    setStatus("installing");
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    setPromptEvent(null);
    setStatus(outcome === "accepted" ? "installed" : "unavailable");
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-margin-mobile py-12 text-center gap-6">
      <Logo className="size-20" />

      {status === "installed" ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-md text-headline-md text-primary">
              Aplikasi Terpasang
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Speaking Pro sudah ada di layar utama Anda.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="w-full max-w-xs rounded-full bg-primary-container py-4 text-body-md font-semibold text-white shadow-soft hover:opacity-90 active:scale-[0.99] transition"
          >
            Buka Aplikasi
          </Link>
        </>
      ) : status === "unavailable" ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-md text-headline-md text-primary">
              Lanjut di Browser
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
              {isIos
                ? "Instalasi otomatis tidak tersedia di Safari. Anda tetap bisa memakai Speaking Pro langsung lewat browser."
                : "Instalasi dibatalkan atau tidak didukung browser ini. Anda tetap bisa memakai Speaking Pro langsung lewat browser."}
            </p>
          </div>
          {isIos && (
            <div className="w-full max-w-xs rounded-2xl bg-surface-container-low p-4 text-label-md font-label-md text-on-surface-variant leading-relaxed text-left">
              Ketuk tombol <span className="font-bold text-primary">Bagikan</span>{" "}
              (ikon kotak dengan panah ke atas) di Safari, lalu pilih{" "}
              <span className="font-bold text-primary">
                Tambahkan ke Layar Utama
              </span>
              .
            </div>
          )}
          <Link
            href="/"
            className="w-full max-w-xs rounded-full bg-primary-container py-4 text-body-md font-semibold text-white shadow-soft hover:opacity-90 active:scale-[0.99] transition"
          >
            Buka app.speakingpro.online
          </Link>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="font-headline-md text-headline-md text-primary">
              Install Speaking Pro
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
              Pasang di layar utama untuk akses secepat aplikasi native.
            </p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            disabled={status === "installing"}
            className="w-full max-w-xs rounded-full bg-primary-container py-4 text-body-md font-semibold text-white shadow-soft hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
          >
            {status === "installing" ? "Memasang..." : "Install Aplikasi"}
          </button>
          <Link
            href="/"
            className="font-label-md text-label-md text-on-surface-variant underline underline-offset-2"
          >
            Lewati, buka di browser saja
          </Link>
        </>
      )}
    </div>
  );
}
