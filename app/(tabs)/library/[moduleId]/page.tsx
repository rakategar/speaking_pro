import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
import { MODULE_META, difficultyColor } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { getTrialStatus } from "@/lib/trial/status";

export const dynamic = "force-dynamic";

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params; // slug
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: module } = await supabase
    .from("practice_modules")
    .select("id, slug, title, category, difficulty, duration_minutes, trial_sequence")
    .eq("slug", moduleId)
    .maybeSingle();
  if (!module) notFound();

  const meta = MODULE_META[module.slug];

  const trialStatus = user ? await getTrialStatus(supabase, user.id) : null;
  const locked =
    trialStatus?.tier === "free" &&
    module.slug !== "free-recording" &&
    !trialStatus.unlockedSlugs.has(module.slug);
  const unlocksOnDay = module.trial_sequence
    ? Math.ceil(module.trial_sequence / 3)
    : null;

  // Personal stats for this module.
  const { data: sessions } = await supabase
    .from("recordings")
    .select("id, created_at, status")
    .eq("module_id", module.id)
    .eq("user_id", user?.id ?? "")
    .order("created_at", { ascending: false });
  const sessionCount = sessions?.length ?? 0;
  const lastSession = sessions?.[0]?.created_at
    ? new Date(sessions[0].created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
    : null;

  return (
    <div className="w-full max-w-md mx-auto relative pb-32">
      <TopAppBar variant="back" title={module.title} />
      <main className="pt-32 px-margin-mobile flex flex-col gap-bento-gap">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary-container to-[#003558] rounded-3xl p-6 relative overflow-hidden shadow-soft">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-cyan/20 blur-3xl rounded-full" />
          <div className="relative z-10 flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-brand-aqua text-[32px]">
                {meta?.icon ?? "mic"}
              </span>
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-brand-cyan/20 text-brand-aqua rounded-full font-label-sm text-label-sm mb-2 border border-brand-cyan/30">
                {module.category}
              </span>
              <h2 className="font-headline-md text-headline-md-mobile text-on-primary">
                {module.title}
              </h2>
              <div className="flex gap-4 items-center mt-2">
                <span className="flex items-center text-inverse-primary font-label-sm text-label-sm">
                  <span className="material-symbols-outlined text-[18px] mr-1">
                    timer
                  </span>
                  {module.duration_minutes} Min
                </span>
                <span
                  className={cn(
                    "flex items-center font-label-sm text-label-sm",
                    difficultyColor(module.difficulty),
                  )}
                >
                  <span className="material-symbols-outlined text-[18px] mr-1">
                    signal_cellular_alt
                  </span>
                  {module.difficulty}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-surface-card rounded-3xl p-6 shadow-soft border border-stroke-subtle">
          <h3 className="font-title-lg text-title-lg text-primary mb-2">
            Tentang Latihan Ini
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            {meta?.description}
          </p>
          {meta?.steps && (
            <ol className="mt-4 space-y-3">
              {meta.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-cyan/10 text-brand-cyan flex items-center justify-center text-label-sm font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-body-md text-on-surface-variant">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Personal stats */}
        <div className="grid grid-cols-2 gap-bento-gap">
          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle">
            <p className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Total Sesi
            </p>
            <p className="font-headline-md text-headline-md text-primary mt-1">
              {sessionCount}
              <span className="text-body-md text-text-secondary font-normal">
                {" "}
                kali
              </span>
            </p>
          </div>
          <div className="bg-surface-card rounded-3xl p-5 shadow-soft border border-stroke-subtle">
            <p className="font-label-sm text-label-sm text-text-secondary uppercase tracking-wider">
              Terakhir Latihan
            </p>
            <p className="font-headline-md text-headline-md text-primary mt-1">
              {lastSession ?? "--"}
            </p>
          </div>
        </div>

        {/* CTA */}
        {locked ? (
          <div className="w-full bg-surface-container text-text-secondary rounded-full py-4 flex items-center justify-center gap-2 shadow-md font-semibold">
            <span className="material-symbols-outlined">lock</span>
            {unlocksOnDay ? `Terkunci — buka di hari ke-${unlocksOnDay}` : "Terkunci"}
          </div>
        ) : (
          <Link
            href={meta?.route ?? "/record"}
            className="w-full bg-secondary-container text-on-secondary rounded-full py-4 flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md font-semibold"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
            Mulai Latihan
          </Link>
        )}
      </main>
    </div>
  );
}
