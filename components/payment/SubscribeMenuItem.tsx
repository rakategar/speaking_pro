"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSnapJs } from "@/lib/payments/snap";

export function SubscribeMenuItem({
  isPro,
  renewsLabel,
}: {
  isPro: boolean;
  renewsLabel: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const orderIdRef = useRef<string | null>(null);

  async function confirmStatus() {
    if (!orderIdRef.current) return;
    try {
      const res = await fetch("/api/payments/subscription/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: orderIdRef.current }),
      });
      const json = await res.json();
      if (json.status === "paid") {
        setMessage("Pembayaran berhasil — langganan Premium aktif 🎉");
        router.refresh();
      } else if (json.status === "pending") {
        setMessage("Pembayaran diproses. Status akan diperbarui otomatis.");
      } else if (json.status === "failed") {
        setMessage("Pembayaran dibatalkan / gagal.");
      }
    } catch {
      // Webhook will still reconcile the order server-side.
    }
  }

  async function startPayment() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/payments/subscription", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? `Gagal memulai pembayaran (HTTP ${res.status})`);
        return;
      }
      orderIdRef.current = json.orderId;
      await loadSnapJs(json.snapJsUrl, json.clientKey);
      window.snap!.pay(json.token, {
        onSuccess: () => void confirmStatus(),
        onPending: () => void confirmStatus(),
        onError: () => setMessage("Pembayaran gagal. Coba lagi."),
        onClose: () => void confirmStatus(),
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={startPayment}
        disabled={busy}
        className="w-full px-6 flex items-center justify-between hover:bg-surface-container-lowest transition-colors group py-3 disabled:opacity-60 text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-tertiary-fixed-dim/10 flex items-center justify-center text-on-tertiary-container">
            <span className="material-symbols-outlined text-[20px]">
              workspace_premium
            </span>
          </div>
          <div className="flex flex-col items-start">
            <span className="font-label-md text-label-md text-primary">
              Subscription
            </span>
            <span className="font-label-sm text-label-sm text-secondary-container">
              {isPro
                ? `Berlangganan • Premium${renewsLabel ? ` s.d. ${renewsLabel}` : ""}`
                : "Belum Berlangganan — Upgrade Premium"}
            </span>
            {message ? (
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                {message}
              </span>
            ) : null}
          </div>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant">
          {busy ? "hourglass_top" : "chevron_right"}
        </span>
      </button>
    </li>
  );
}
