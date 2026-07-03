import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BackButton } from "@/components/ui/BackButton";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

const FEATURES = [
  "10 Menit Daily Drill",
  "Rapor Analisis Mingguan",
  "AI Analytics Tanpa Batas",
];

export default async function RenewSubscriptionPage() {
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("coaching_products")
    .select("id, title, price_idr, description")
    .eq("type", "subscription")
    .order("price_idr")
    .limit(1)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start overflow-x-hidden">
      <main className="w-full max-w-md mx-auto px-margin-mobile flex-1 flex flex-col gap-bento-gap relative z-10 pt-8 pb-40">
        {/* Header */}
        <header className="w-full flex justify-between items-center mb-4">
          <BackButton />
          <div className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
            Speaking Pro™
          </div>
          <div className="w-10" />
        </header>

        {/* Hero */}
        <div className="bg-gradient-to-br from-secondary-container to-secondary rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,163,255,0.15)] relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/20 blur-3xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex flex-col items-start">
            <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 mb-4 flex items-center gap-1.5 border border-white/30">
              <span
                className="material-symbols-outlined text-white text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                warning
              </span>
              <span className="font-label-sm text-label-sm text-white">
                Status Akses
              </span>
            </div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-white mb-2 leading-tight">
              Akses Anda Berakhir
            </h1>
            <p className="font-body-md text-body-md text-white/90">
              Lanjutkan Perjalanan Bicara Anda dan capai kefasihan dengan fitur
              premium yang telah menanti.
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-surface-card rounded-2xl p-6 border border-stroke-subtle shadow-soft flex flex-col gap-6 relative">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="font-title-lg text-title-lg text-on-surface mb-1">
                {plan?.title ?? "Speaking Pro Premium"}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {plan?.description ?? "Akses penuh selama 30 hari."}
              </p>
            </div>
            <div className="bg-tertiary-fixed-dim/20 text-on-tertiary-container px-2 py-1 rounded-md font-label-sm text-label-sm font-bold border border-tertiary-fixed-dim/30">
              PREMIUM
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary">
              {formatRupiah(plan?.price_idr ?? 149000)}
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              / bulan
            </span>
          </div>
          <div className="h-px bg-stroke-subtle w-full" />
          <ul className="flex flex-col gap-4">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-tertiary-fixed-dim/20 p-1 flex items-center justify-center">
                  <span
                    className="material-symbols-outlined text-[16px] text-on-tertiary-container"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    check
                  </span>
                </div>
                <span className="font-body-md text-body-md text-on-surface">
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-0 w-full bg-surface-card/80 backdrop-blur-xl border-t border-stroke-subtle p-margin-mobile z-50 flex flex-col items-center gap-4">
        <Link
          href={plan ? `/checkout/${plan.id}` : "/pro-shop"}
          className="w-full max-w-md bg-primary-container text-on-primary text-center py-4 rounded-2xl font-label-md text-label-md hover:opacity-90 transition-all duration-300 shadow-[0_4px_15px_rgba(13,28,50,0.2)] active:scale-[0.98]"
        >
          Aktifkan Kembali Sekarang
        </Link>
        <div className="flex items-center justify-center gap-1.5 text-on-surface-variant opacity-80">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          <span className="font-label-sm text-label-sm">
            Pembayaran Aman &amp; Enkripsi 256-bit
          </span>
        </div>
      </div>
    </div>
  );
}
