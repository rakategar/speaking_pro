"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadSnapJs } from "@/lib/payments/snap";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TopAppBar } from "@/components/layout/TopAppBar";

type Product = {
  id: string;
  title: string;
  type: string;
  price_idr: number;
  description: string | null;
  coachName: string | null;
};

const TYPE_BADGE: Record<string, string> = {
  ebook: "Buku Fisik",
  video_course: "E-Course",
  "1on1": "Exclusive Service",
  subscription: "Subscription",
};

// Upcoming weekdays offered as preferred-date options for a 1-on-1 booking.
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

export function CheckoutForm({
  product,
  defaultName = "",
  defaultEmail = "",
}: {
  product: Product;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const needsSchedule = product.type === "1on1";
  const needsShipping = product.type === "ebook";
  const isSubscription = product.type === "subscription";
  // ebook + 1on1 go through real Midtrans Snap via /api/payments/checkout.
  const isSale = product.type === "ebook" || product.type === "1on1";

  // Contact (buyer) — Pro Shop purchases only.
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [whatsapp, setWhatsapp] = useState("");

  // 1-on-1 booking details.
  const dateOptions = useMemo(() => nextWeekdays(14), []);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [domicile, setDomicile] = useState("");
  const [topic, setTopic] = useState("");

  // Buku Speakingpro shipping address.
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState<{ orderId: string } | null>(null);

  function toggleDate(iso: string) {
    setSelectedDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso],
    );
  }

  const contactComplete =
    !isSale || (name.trim() !== "" && email.trim() !== "" && whatsapp.trim() !== "");
  const scheduleComplete =
    !needsSchedule ||
    (selectedDates.length >= 2 && domicile.trim() !== "" && topic.trim() !== "");
  const shippingComplete =
    !needsShipping ||
    (shippingAddress.trim() !== "" &&
      shippingCity.trim() !== "" &&
      shippingPostalCode.trim() !== "");
  const canPay =
    isSubscription || (contactComplete && scheduleComplete && shippingComplete);

  // --- Subscription (unchanged real-Midtrans flow) ---
  async function confirmSubscription(orderId: string) {
    try {
      const res = await fetch("/api/payments/subscription/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json.status === "paid") setPaid({ orderId });
      else if (json.status === "failed")
        setError("Pembayaran dibatalkan atau gagal. Silakan coba lagi.");
      else
        setError(
          "Pembayaran sedang diproses. Status Premium akan aktif otomatis begitu pembayaran dikonfirmasi.",
        );
    } catch {
      setError(
        "Tidak bisa memastikan status pembayaran. Jika sudah membayar, status akan diperbarui otomatis.",
      );
    } finally {
      setPaying(false);
    }
  }

  async function paySubscription() {
    const res = await fetch("/api/payments/subscription", { method: "POST" });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error ?? `Gagal memulai pembayaran (HTTP ${res.status})`);
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

  // --- Pro Shop sale (ebook / 1on1) ---
  async function confirmSale(orderId: string) {
    try {
      const res = await fetch("/api/payments/checkout/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json();
      if (json.status === "paid") setPaid({ orderId });
      else if (json.status === "failed")
        setError("Pembayaran dibatalkan atau gagal. Silakan coba lagi.");
      else
        setError(
          "Pembayaran sedang diproses. Konfirmasi akan dikirim otomatis begitu pembayaran diterima.",
        );
    } catch {
      setError(
        "Tidak bisa memastikan status pembayaran. Jika sudah membayar, konfirmasi akan dikirim otomatis.",
      );
    } finally {
      setPaying(false);
    }
  }

  async function paySale() {
    const res = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        customer: { name, email, whatsapp },
        booking: needsSchedule
          ? { preferredDates: selectedDates, domicile, topic }
          : undefined,
        shipping: needsShipping
          ? {
              address: shippingAddress,
              city: shippingCity,
              postalCode: shippingPostalCode,
            }
          : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error ?? `Gagal memulai pembayaran (HTTP ${res.status})`);
    await loadSnapJs(json.snapJsUrl, json.clientKey);
    window.snap!.pay(json.token, {
      onSuccess: () => void confirmSale(json.orderId),
      onPending: () => void confirmSale(json.orderId),
      onError: () => {
        setError("Pembayaran gagal. Silakan coba lagi.");
        setPaying(false);
      },
      onClose: () => void confirmSale(json.orderId),
    });
  }

  async function pay() {
    if (paying || !canPay) return;
    setError(null);
    setPaying(true);
    try {
      if (isSubscription) {
        await paySubscription();
      } else {
        await paySale();
      }
      // Snap opens a modal; `paying` stays true until a callback resolves it.
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
            {needsSchedule
              ? "Terima kasih! Tim kami akan menghubungi Anda via WhatsApp untuk konfirmasi jadwal dari tanggal pilihan Anda."
              : product.type === "ebook"
                ? "Buku Speakingpro akan segera dikirim ke alamat Anda. Konfirmasi & nomor resi akan dikirim via email dan WhatsApp."
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
            href="/pro-shop"
            className="w-full border border-outline-variant text-on-surface rounded-full py-3.5 font-semibold active:scale-95 transition text-center"
          >
            Kembali ke Pro Shop
          </Link>
        </div>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-stroke-subtle bg-surface-card px-4 py-3 text-body-md text-on-surface placeholder:text-text-secondary focus:outline-none focus:border-secondary-container transition-colors";

  return (
    <div className="min-h-screen bg-background pb-32">
      <TopAppBar variant="transactional" title="Checkout" />

      <main className="pt-32 px-margin-mobile max-w-lg mx-auto flex flex-col gap-bento-gap">
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

        {/* Contact (Pro Shop purchases) */}
        {isSale && (
          <section className="bento-card p-6 flex flex-col gap-4">
            <h3 className="font-title-lg text-title-lg text-on-background">
              Data Kontak
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-text-secondary">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Anda"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-text-secondary">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@contoh.com"
                  className={inputClass}
                />
                {product.type === "ebook" && (
                  <p className="font-label-sm text-label-sm text-text-secondary mt-1">
                    Konfirmasi pesanan akan dikirim ke email ini.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-text-secondary">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        )}

        {/* Shipping address (Buku Speakingpro only) */}
        {needsShipping && (
          <section className="bento-card p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-title-lg text-title-lg text-on-background">
                Alamat Pengiriman
              </h3>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                Buku Speakingpro adalah buku fisik yang akan dikirim ke alamat
                ini.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-text-secondary">
                Alamat Lengkap
              </label>
              <textarea
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
                placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
                className={cn(inputClass, "resize-none")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-text-secondary">
                  Kota
                </label>
                <input
                  type="text"
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  placeholder="mis. Jakarta"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-text-secondary">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                  placeholder="mis. 40123"
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        )}

        {/* Scheduling (1-on-1 only) */}
        {needsSchedule && (
          <section className="bento-card p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-title-lg text-title-lg text-on-background">
                Pilih Tanggal Konsultasi
              </h3>
              <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                Pilih minimal 2 tanggal yang cocok. Tim kami akan konfirmasi
                slot final via WhatsApp.
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {dateOptions.map((d) => {
                const iso = d.toISOString();
                const selected = selectedDates.includes(iso);
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => toggleDate(iso)}
                    className={cn(
                      "flex flex-col items-center justify-center h-16 rounded-xl transition-colors",
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
                        "font-title-md text-title-md",
                        selected
                          ? "text-on-tertiary-container"
                          : "text-on-background",
                      )}
                    >
                      {d.getDate()}
                    </span>
                    <span
                      className={cn(
                        "font-label-sm text-[10px]",
                        selected
                          ? "text-on-tertiary-container"
                          : "text-text-secondary",
                      )}
                    >
                      {d.toLocaleDateString("id-ID", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="font-label-sm text-label-sm text-text-secondary">
              {selectedDates.length} tanggal dipilih
            </p>

            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-text-secondary">
                Domisili (Kota)
              </label>
              <input
                type="text"
                value={domicile}
                onChange={(e) => setDomicile(e.target.value)}
                placeholder="mis. Jakarta"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-label-sm text-label-sm text-text-secondary">
                Topik yang ingin dibahas
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="Ceritakan singkat apa yang ingin Anda konsultasikan..."
                className={cn(inputClass, "resize-none")}
              />
            </div>
          </section>
        )}

        {/* Payment method — always via Midtrans for in-app checkout */}
        <section className="flex flex-col gap-3">
          <h3 className="font-title-lg text-title-lg text-on-background px-1">
            Metode Pembayaran
          </h3>
          <div className="bento-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px] text-secondary-container">
                account_balance_wallet
              </span>
            </div>
            <p className="font-body-md text-body-md text-text-secondary">
              Pilih metode pembayaran (QRIS, Virtual Account, e-wallet, kartu) di
              jendela pembayaran aman Midtrans setelah menekan{" "}
              <span className="font-semibold text-on-background">
                Bayar Sekarang
              </span>
              .
            </p>
          </div>
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
            disabled={paying || !canPay}
            className="w-full bg-primary-container text-on-primary h-14 rounded-full font-label-md text-label-md flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">
              {paying ? "hourglass_top" : "lock"}
            </span>
            {paying
              ? "Memproses Pembayaran..."
              : !contactComplete
                ? "Lengkapi Data Kontak"
                : !shippingComplete
                  ? "Lengkapi Alamat Pengiriman"
                  : !scheduleComplete
                    ? "Pilih Min. 2 Tanggal & Isi Detail"
                    : "Bayar Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
}
