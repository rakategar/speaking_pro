// Client-side helper: loads Midtrans snap.js once. The client key is
// delivered at runtime by the API (no NEXT_PUBLIC_ var), so rotating keys
// or flipping sandbox<->production needs no rebuild.

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

export function loadSnapJs(src: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-midtrans="snap"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Gagal memuat Midtrans Snap")),
      );
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.dataset.midtrans = "snap";
    script.setAttribute("data-client-key", clientKey);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap"));
    document.head.appendChild(script);
  });
}
