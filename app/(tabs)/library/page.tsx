import { createClient } from "@/lib/supabase/server";
import { LibraryBrowser } from "@/components/library/LibraryBrowser";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("practice_modules")
    .select("id, slug, title, category, difficulty, duration_minutes, is_ai_recommended")
    .order("created_at");

  return (
    <div className="w-full max-w-md mx-auto relative">
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-margin-mobile py-4 w-full max-w-md mx-auto">
          <h1 className="font-heading text-headline-md-mobile text-headline-md font-extrabold text-primary tracking-tight">
            Practice Library
          </h1>
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-surface-card shadow-soft flex items-center justify-center text-primary hover:opacity-80 active:scale-95 transition"
            aria-label="Notifikasi"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              notifications
            </span>
          </button>
        </div>
      </header>

      <main className="pt-24 px-margin-mobile w-full">
        <LibraryBrowser modules={modules ?? []} />
      </main>
    </div>
  );
}
