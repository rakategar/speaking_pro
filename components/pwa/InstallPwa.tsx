"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Install Aplikasi" row for the profile menu. Uses the captured
 * beforeinstallprompt event on Chrome/Edge Android; on iOS (no such event)
 * it reveals the Add-to-Home-Screen steps instead. Hidden once the app
 * already runs in standalone mode.
 */
export function InstallPwa() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setPrompt(null);
    } else {
      // No install event (iOS Safari, or the browser hasn't fired it yet).
      setShowIosHelp((v) => !v);
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={install}
        className="w-full px-6 flex items-center justify-between hover:bg-surface-container-lowest transition-colors group py-3 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-secondary-container/10 flex items-center justify-center text-secondary-container">
            <span className="material-symbols-outlined text-[20px]">
              install_mobile
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-label-md text-label-md text-primary">
              Install Aplikasi
            </span>
            <span className="font-label-sm text-label-sm text-secondary-container">
              Pasang di layar utama HP Anda
            </span>
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">
          download
        </span>
      </button>
      {showIosHelp && (
        <div className="px-6 pb-4 -mt-1">
          <div className="rounded-2xl bg-surface-container-low p-4 text-label-md font-label-md text-on-surface-variant leading-relaxed">
            {isIos ? (
              <>
                Di iPhone/iPad: ketuk tombol{" "}
                <span className="font-bold text-primary">Bagikan</span> (ikon
                kotak dengan panah ke atas) di Safari, lalu pilih{" "}
                <span className="font-bold text-primary">
                  Tambahkan ke Layar Utama
                </span>
                .
              </>
            ) : (
              <>
                Buka menu browser (⋮) lalu pilih{" "}
                <span className="font-bold text-primary">
                  Tambahkan ke layar utama / Install app
                </span>
                .
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
