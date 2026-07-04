"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PushState =
  | "unsupported"
  | "idle" // supported, not yet subscribed
  | "asking"
  | "enabled"
  | "denied";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Banner/button that asks for notification permission and registers the
 * push subscription, so the user hears back when their analysis is done.
 */
export function EnablePush({ className }: { className?: string }) {
  const [state, setState] = useState<PushState>("idle");

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    // Already subscribed?
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => {
        if (sub && Notification.permission === "granted") setState("enabled");
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(async () => {
    setState("asking");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "idle");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("VAPID public key missing");
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("subscribe API failed");
      setState("enabled");
    } catch (e) {
      console.error("[push] enable failed:", e);
      setState("idle");
    }
  }, []);

  if (state === "unsupported") return null;

  if (state === "enabled") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-label-md font-label-md text-secondary-container",
          className,
        )}
      >
        <span className="material-symbols-outlined text-[18px]">
          notifications_active
        </span>
        Notifikasi aktif — Anda akan dikabari saat analisis selesai.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <p
        className={cn(
          "text-label-md font-label-md text-on-surface-variant",
          className,
        )}
      >
        Notifikasi diblokir browser. Izinkan notifikasi untuk situs ini di
        pengaturan browser agar dikabari saat analisis selesai.
      </p>
    );
  }

  return (
    <button
      type="button"
      onClick={enable}
      disabled={state === "asking"}
      className={cn(
        "flex items-center justify-center gap-2 rounded-full bg-secondary-container text-on-secondary font-semibold px-5 py-3 shadow-md active:scale-95 transition disabled:opacity-60",
        className,
      )}
    >
      <span className="material-symbols-outlined text-[20px]">
        notifications
      </span>
      {state === "asking" ? "Meminta izin..." : "Kabari saya jika selesai"}
    </button>
  );
}
