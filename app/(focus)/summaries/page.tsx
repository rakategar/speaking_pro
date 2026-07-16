import { createClient } from "@/lib/supabase/server";
import { TopAppBar } from "@/components/layout/TopAppBar";

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default async function SummariesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .maybeSingle();

  const { data: summaries } = await supabase
    .from("weekly_summaries")
    .select("id, week_index, period_start, period_end, session_count")
    .eq("user_id", user.id)
    .order("week_index", { ascending: false });

  const { data: certificate } = await supabase
    .from("monthly_certificates")
    .select("id, badge_tier, session_count, period_start, period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const isPremium = profile?.subscription_tier === "premium";
  const BADGE_LABEL: Record<string, string> = {
    gold: "Gold",
    silver: "Silver",
    bronze: "Bronze",
  };

  return (
    <div className="min-h-screen bg-background">
      <TopAppBar variant="back" title="Ringkasan Mingguan" />
      <main className="pt-32 pb-16 px-margin-mobile max-w-2xl mx-auto flex flex-col gap-4">
        {certificate && (
          <div className="bg-gradient-to-br from-secondary-container to-secondary rounded-3xl shadow-[0_8px_30px_rgba(0,163,255,0.15)] p-6 flex items-center justify-between gap-4 text-on-primary">
            <div className="flex flex-col gap-1">
              <p className="font-label-sm text-label-sm text-white/80">
                🏆 {BADGE_LABEL[certificate.badge_tier] ?? certificate.badge_tier} Achiever
              </p>
              <p className="font-title-lg text-title-lg text-white">
                Sertifikat 1 Bulan Premium
              </p>
              <p className="font-label-sm text-label-sm text-white/80">
                {fmtDate(certificate.period_start)} - {fmtDate(certificate.period_end)} ·{" "}
                {certificate.session_count} sesi
              </p>
            </div>
            <a
              href={`/api/certificates/${certificate.id}/download`}
              className="shrink-0 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition"
              aria-label="Unduh Sertifikat"
            >
              <span className="material-symbols-outlined text-[20px]">
                download
              </span>
            </a>
          </div>
        )}

        {!summaries?.length && (
          <div className="bg-surface-card rounded-3xl border border-stroke-subtle/60 shadow-soft p-6 flex flex-col items-center text-center gap-3">
            <span className="material-symbols-outlined text-secondary text-[32px]">
              summarize
            </span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isPremium
                ? "Ringkasan mingguan pertama Anda akan muncul di sini setelah genap satu minggu berlangganan Premium."
                : "Ringkasan mingguan otomatis tersedia untuk pelanggan Premium. Upgrade untuk mulai menerima laporan mingguan."}
            </p>
          </div>
        )}

        {summaries?.map((s) => (
          <div
            key={s.id}
            className="bg-surface-card rounded-2xl border border-stroke-subtle/60 shadow-soft p-5 flex items-center justify-between gap-4"
          >
            <div className="flex flex-col gap-1">
              <p className="font-label-md text-label-md text-primary">
                Ringkasan Minggu #{s.week_index}
              </p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {fmtDate(s.period_start)} - {fmtDate(s.period_end)} ·{" "}
                {s.session_count} sesi
              </p>
            </div>
            <a
              href={`/api/summaries/${s.id}/download`}
              className="shrink-0 w-10 h-10 rounded-full bg-secondary-container/15 text-secondary flex items-center justify-center hover:opacity-80 active:scale-95 transition"
              aria-label="Unduh PDF"
            >
              <span className="material-symbols-outlined text-[20px]">
                download
              </span>
            </a>
          </div>
        ))}
      </main>
    </div>
  );
}
