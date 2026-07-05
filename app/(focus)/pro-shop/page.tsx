import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { formatRupiahCompact } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPE_BADGE: Record<string, string> = {
  ebook: "E-Book",
  video_course: "Video Course",
  "1on1": "Exclusive Service",
  subscription: "Subscription",
};

const TYPE_ICON: Record<string, string> = {
  ebook: "menu_book",
  video_course: "play_circle",
  "1on1": "record_voice_over",
  subscription: "workspace_premium",
};

export default async function ProShopPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("coaching_products")
    .select("id, title, type, price_idr, description, coaches(name, headline)")
    .neq("type", "subscription")
    .order("price_idr");

  const coachName = products?.[0]?.coaches?.name ?? "Coach Faisal Maulana";

  return (
    <div className="min-h-screen bg-surface pb-16">
      <TopAppBar variant="back" title="Pro Shop" />
      <main className="pt-24 px-margin-mobile max-w-7xl mx-auto stagger">
        <div className="mb-8 mt-4">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">
            Pro Shop
          </h2>
          <p className="font-body-md text-body-md text-text-secondary font-inter">
            Katalog Produk Digital &amp; Layanan Premium {coachName}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-bento-gap">
          {(products ?? []).map((p) => {
            const isExclusive = p.type === "1on1";
            return (
              <article
                key={p.id}
                className={
                  isExclusive
                    ? "bg-primary-container rounded-2xl p-6 flex flex-col h-full relative overflow-hidden shadow-[0_0_30px_rgba(0,218,243,0.15)] border border-white/10 md:col-span-2 lg:col-span-1"
                    : "bg-surface-card rounded-2xl p-6 border border-stroke-subtle shadow-soft flex flex-col h-full relative overflow-hidden"
                }
              >
                {isExclusive && (
                  <div className="absolute -right-16 -top-16 w-48 h-48 bg-tertiary-fixed-dim/20 blur-3xl rounded-full pointer-events-none" />
                )}
                <div
                  className={
                    isExclusive
                      ? "w-full h-40 rounded-xl mb-6 bg-white/5 border border-white/10 flex items-center justify-center"
                      : "w-full h-40 rounded-xl mb-6 bg-surface-container-low flex items-center justify-center"
                  }
                >
                  <span
                    className={
                      isExclusive
                        ? "material-symbols-outlined text-tertiary-fixed-dim text-[64px]"
                        : "material-symbols-outlined text-secondary-container text-[64px]"
                    }
                  >
                    {TYPE_ICON[p.type] ?? "storefront"}
                  </span>
                </div>
                <div className="flex-grow relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={
                        isExclusive
                          ? "inline-block px-2 py-1 bg-[rgba(0,218,243,0.2)] text-tertiary-fixed-dim text-[10px] font-bold tracking-wider uppercase rounded font-inter"
                          : "inline-block px-2 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-bold tracking-wider uppercase rounded font-inter"
                      }
                    >
                      {TYPE_BADGE[p.type] ?? p.type}
                    </span>
                    {isExclusive && (
                      <>
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed-dim opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-fixed-dim" />
                        </span>
                        <span className="text-xs text-tertiary-fixed-dim font-medium font-inter">
                          Best Seller
                        </span>
                      </>
                    )}
                  </div>
                  <h3
                    className={
                      isExclusive
                        ? "font-title-lg text-title-lg text-on-primary mb-2"
                        : "font-title-lg text-title-lg text-primary mb-2"
                    }
                  >
                    {p.title}
                  </h3>
                  <p
                    className={
                      isExclusive
                        ? "font-body-md text-inverse-primary mb-6 font-inter text-sm"
                        : "font-body-md text-text-secondary mb-6 font-inter text-sm"
                    }
                  >
                    {p.description}
                  </p>
                </div>
                <div
                  className={
                    isExclusive
                      ? "mt-auto pt-4 border-t border-white/10 relative z-10"
                      : "mt-auto pt-4 border-t border-stroke-subtle"
                  }
                >
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <span
                        className={
                          isExclusive
                            ? "block text-xs text-inverse-primary font-inter mb-1"
                            : "block text-xs text-text-secondary font-inter mb-1"
                        }
                      >
                        Harga
                      </span>
                      <span
                        className={
                          isExclusive
                            ? "font-headline-md text-headline-md text-on-primary block leading-none"
                            : "font-headline-md text-headline-md text-primary block leading-none"
                        }
                      >
                        {formatRupiahCompact(p.price_idr)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/checkout/${p.id}`}
                    className={
                      isExclusive
                        ? "w-full bg-tertiary-fixed-dim text-primary-container py-3 px-4 rounded-xl font-label-md text-label-md flex justify-center items-center gap-2 font-bold shadow-[0_0_15px_rgba(0,218,243,0.4)] hover:opacity-90 active:scale-95 transition"
                        : "w-full bg-primary-container text-on-primary py-3 px-4 rounded-xl font-label-md text-label-md flex justify-center items-center gap-2 hover:opacity-90 active:scale-95 transition"
                    }
                  >
                    {isExclusive ? "Jadwalkan Sekarang" : "Beli Sekarang"}
                    <span className="material-symbols-outlined text-sm">
                      {isExclusive ? "calendar_today" : "arrow_forward"}
                    </span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
