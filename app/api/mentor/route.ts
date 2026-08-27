import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateMentorNote,
  loadMentorContext,
  readCachedNote,
} from "@/lib/mentor/service";

export const runtime = "nodejs";
export const maxDuration = 90;

// POST /api/mentor -- the AI note for the caller's current Mentor AI plan.
//
// POST rather than GET on purpose: this can spend Gemini tokens, and a GET
// would invite link prefetchers and caches to spend them on the user's behalf.
//
// The three modules themselves are computed server-side on the page render and
// cost nothing; this endpoint only fills in the prose around them.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const context = await loadMentorContext(supabase);
  const slugs = context.picks.map((p) => p.slug);

  const cached = await readCachedNote(user.id, context.reportId, slugs);
  if (cached) {
    return NextResponse.json({ note: cached, cached: true });
  }

  try {
    const note = await generateMentorNote(user.id, context);
    return NextResponse.json({ note, cached: false });
  } catch (error) {
    // Best-effort, same posture as the receipt attachment in
    // lib/subscription/activate.ts: the page already has its modules and its
    // numbers, so an unavailable model must not empty it.
    console.error("[mentor] note generation failed:", error);
    return NextResponse.json({
      note: null,
      cached: false,
      error: "Catatan mentor belum bisa dibuat saat ini. Rekomendasi modul di bawah tetap akurat.",
    });
  }
}
