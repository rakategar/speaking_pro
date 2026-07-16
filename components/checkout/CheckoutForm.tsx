"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PaymentMethodRadio,
  type PaymentMethod,
} from "@/components/ui/PaymentMethodRadio";
import { loadSnapJs } from "@/lib/payments/snap";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type Product = {
  id: string;
  title: string;
  type: string;
  price_idr: number;
  description: string | null;
  coachName: string | null;
};

const TIME_SLOTS = [
  { time: "09:00", taken: false },
  { time: "10:00", taken: false },
  { time: "11:00", taken: true },
  { time: "14:00", taken: false },
  { time: "15:00", taken: false },
  { time: "16:00", taken: true },
];

const TYPE_BADGE: Record<string, string> = {
  ebook: "E-Book",
  video_course: "Video Course",
  "1on1": "Exclusive Service",
  subscription: "Subscription",
};

function nextWeekdays(count: number): Date[] {
  const days: Date[] = [];
  const d = new Date();
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(d));
  }
  return days;
}

export function CheckoutForm({ product }: { product: Product }) {
  const router = useRouter();
  const needsSchedule = product.type === "1on1";
  // Subscriptions run through the real Midtrans Snap gateway; other product
  // types still use the mock gateway (see /api/checkout/mock-pay).
  const isSubscription = product.type === "subscription";

  const days = useMemo(() => nextWeekdays(5), []);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("qris");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<{ orderId: string } | null>(null);

  const monthLabel = days[dayIndex].toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const scheduleComplete = !needsSchedule || slot !== null;

  // Re-check a Snap order server-side and flip the UI to "paid" once Midtrans
  // confirms settlement. Also runs on the Snap popup closing, in case the
  // user paid via QRIS/VA and the webhook hasn't landed yet.
  async function confirmSubscription(orderId: string) {
    try {
      const res = await fetch("/api/payments/subscription/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json.status === "paid") {
        setPaid({ orderId });
      } else if (json.status === "failed") {
        setError("Pembayaran dibatalkan atau gagal. Silakan coba lagi.");
      } else {
        setError(
          "Pembayaran sedang diproses. Status Premium akan aktif otomatis begitu pembayaran dikonfirmasi.",
        );
      }
    } catch {
      // The webhook still reconciles the order server-side.
      setError(
        "Tidak bisa memastikan status pembayaran. Jika sudah membayar, status Premium akan aktif otomatis.",
      );
    } finally {
      setPaying(false);
    }
  }

  async function paySubscription() {
    const res = await fetch("/api/payments/subscription", { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        json.error ?? `Gagal memulai pembayaran (HTTP ${res.status})`,
      );
    }
    await loadSnapJs(json.snapJsUrl, json.clientKey);
    window.snap!.pay(json.token, {
      onSuccess: () => void confirmSubscription(json.orderId),
      onPending: () => void confirmSubscription(json.orderId),
      onError: () => {
        setError("Pembayaran gagal. Silakan coba lagi.");
        setPaying(false);
      },
      onClose: () => void confirmSubscription(json.orderId),
    });
  }

  async function pay() {
    if (paying || !scheduleComplete) return;
    setError(null);
    setPaying(true);
    try {
      if (isSubscription) {
        // Snap opens a modal; `paying` stays true until a callback resolves it.
        await paySubscription();
        return;
      }
      let scheduledAt: string | undefined;
      if (needsSchedule && slot) {
        const [h, m] = slot.split(":").map(Number);
        const dt = new Date(days[dayIndex]);
        dt.setHours(h, m, 0, 0);
        scheduledAt = dt.toISOString();
      }
      const res = await fetch("/api/checkout/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          paymentMethod: method,
          scheduledAt,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Pembayaran gagal");
      setPaid({ orderId: json.orderId });
      setPaying(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setPaying(false);
    }
  }

  if (paid) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-margin-mobile gap-6 text-center">
        <div className="w-24 h-24 rounded-full bg-secondary-container/10 flex items-center justify-center">
          <span
            className="material-symbols-outlined text-secondary-container text-[48px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <div>
          <h2 className="font-headline-md text-headline-md text-primary">
            Pembayaran Berhasil!
          </h2>
          <p className="text-body-md text-text-secondary mt-2 max-w-xs">
            {needsSchedule && slot
              ? `Sesi "${product.title}" Anda terjadwal ${days[dayIndex].toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} pukul ${slot} WIB.`
              : `"${product.title}" sudah aktif di akun Anda.`}
          </p>
          <p className="text-label-sm text-text-secondary mt-2">
            Order ID: {paid.orderId.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="w-full bg-primary-container text-on-primary rounded-full py-3.5 font-semibold shadow-md active:scale-95 transition"
          >
            Kembali ke Dashboard
          </button>
          <Link
            href="/profile"
            className="w-full border border-outline-variant text-on-surface rounded-full py-3.5 font-semibold active:scale-95 transition text-center"
          >
            Lihat Pembelian Saya
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Transactional top bar */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl flex items-center justify-between px-margin-mobile py-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors active:scale-95 flex items-center justify-center"
          aria-label="Kembali"
        >
          <span className="material-symbols-outlined text-on-surface">
            arrow_back
          </span>
        </button>
        <h1 className="font-title-lg text-title-lg text-primary text-center absolute left-1/2 -translate-x-1/2">
          Checkout
        </h1>
        <div className="w-10" />
      </header>

      <main className="pt-24 px-margin-mobile max-w-lg mx-auto flex flex-col gap-bento-gap">
        {/* Plan summary */}
        <section className="bento-card p-6 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-xl shrink-0 border border-stroke-subtle bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-tertiary-fixed-dim text-[36px]">
                {product.type === "1on1"
                  ? "record_voice_over"
                  : product.type === "ebook"
                    ? "menu_book"
                    : product.type === "video_course"
                      ? "play_circle"
                      : "workspace_premium"}
              </span>
            </div>
            <div className="flex-1">
              <span className="inline-block bg-tertiary-fixed-dim/10 text-on-tertiary-container font-label-sm text-label-sm px-2 py-1 rounded-full border border-tertiary-fixed-dim/20 mb-1">
                {TYPE_BADGE[product.type] ?? product.type}
              </span>
              <h2 className="font-title-lg text-title-lg text-on-background mb-1">
                {product.title}
              </h2>
              <p className="font-body-md text-body-md text-text-secondary line-clamp-2">
                {product.description}
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-stroke-subtle flex items-center justify-between">
            <span className="font-body-md text-body-md text-text-secondary">
              Harga
            </span>
            <span className="font-headline-md text-headline-md text-primary">
              {formatRupiah(product.price_idr)}
            </span>
          </div>
        </section>

        {/* Scheduling (1-on-1 only) */}
        {needsSchedule && (
          <section className="bento-card p-6 flex flex-col gap-4">
            <h3 className="font-title-lg text-title-lg text-on-background">
              Pilih Jadwal Konsultasi
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md text-on-background capitalize">
                  {monthLabel}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 hide-scrollbar">
                {days.map((d, i) => {
                  const selected = i === dayIndex;
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => setDayIndex(i)}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[64px] h-20 rounded-xl transition-colors",
                        selected
                          ? "border-2 border-tertiary-fixed-dim bg-tertiary-fixed-dim/10"
                          : "border border-stroke-subtle hover:bg-surface-variant",
                      )}
                    >
                      <span
                        className={cn(
                          "font-label-sm text-label-sm",
                          selected
                            ? "text-on-tertiary-container"
                            : "text-text-secondary",
                        )}
                      >
                        {d.toLocaleDateString("id-ID", { weekday: "short" })}
                      </span>
                      <span
                        className={cn(
                          "font-title-lg text-title-lg",
                          selected
                            ? "text-on-tertiary-container"
                            : "text-on-background",
                        )}
                      >
                        {d.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-label-md text-label-md text-on-background">
                Waktu Tersedia (WIB)
              </span>
              <div className="grid grid-cols-3 gap-3">
                {TIME_SLOTS.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={s.taken}
                    onClick={() => setSlot(s.time)}
                    className={cn(
                      "py-3 rounded-xl font-label-md text-label-md transition-colors",
                      s.taken
                        ? "border border-stroke-subtle opacity-40 cursor-not-allowed bg-surface-container text-text-secondary"
                        : slot === s.time
                          ? "border-2 border-tertiary-fixed-dim bg-tertiary-fixed-dim/10 text-on-tertiary-container"
                          : "border border-stroke-subtle hover:bg-surface-variant text-on-background",
                    )}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border border-stroke-subtle" />
                  <span className="font-label-sm text-label-sm text-text-secondary">
                    Tersedia
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-surface-container opacity-40" />
                  <span className="font-label-sm text-label-sm text-text-secondary">
                    Terisi
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Payment method */}
        <section className="flex flex-col gap-3">
          <h3 className="font-title-lg text-title-lg text-on-background px-1">
            Metode Pembayaran
          </h3>
          {isSubscription ? (
            <div className="bento-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-container/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] text-secondary-container">
                  account_balance_wallet
                </span>
              </div>
              <p className="font-body-md text-body-md text-text-secondary">
                Pilih metode pembayaran (QRIS, Virtual Account, e-wallet, kartu)
                di jendela pembayaran aman Midtrans setelah menekan{" "}
                <span className="font-semibold text-on-background">
                  Bayar Sekarang
                </span>
                .
              </p>
            </div>
          ) : (
            <PaymentMethodRadio
              value={method}
              onChange={setMethod}
              disabled={paying}
            />
          )}
        </section>

        {/* Summary */}
        <section className="bento-card p-6 flex flex-col gap-3">
          <h3 className="font-title-lg text-title-lg text-on-background mb-1">
            Ringkasan
          </h3>
          <div className="flex justify-between items-center font-body-md text-body-md text-text-secondary">
            <span>Subtotal</span>
            <span>{formatRupiah(product.price_idr)}</span>
          </div>
          <div className="flex justify-between items-center font-body-md text-body-md text-text-secondary">
            <span>Pajak (PPN)</span>
            <span>Rp 0</span>
          </div>
          <div className="pt-3 border-t border-stroke-subtle flex justify-between items-center mt-1">
            <span className="font-title-lg text-title-lg text-on-background">
              Total
            </span>
            <span className="font-headline-md text-headline-md text-primary">
              {formatRupiah(product.price_idr)}
            </span>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-2xl bg-error-container text-on-error-container px-4 py-3 text-label-md font-label-md"
          >
            {error}
          </p>
        )}
      </main>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 w-full glassmorphism border-t border-stroke-subtle p-margin-mobile z-50">
        <div className="max-w-lg mx-auto">
          <button
            type="button"
            onClick={pay}
            disabled={paying || !scheduleComplete}
            className="w-full bg-primary-container text-on-primary h-14 rounded-full font-label-md text-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">
              {paying ? "hourglass_top" : "lock"}
            </span>
            {paying
              ? "Memproses Pembayaran..."
              : !scheduleComplete
                ? "Pilih Jadwal Dulu"
                : "Bayar Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
}
