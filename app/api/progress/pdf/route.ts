import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyseProgress } from "@/lib/progress/analytics";
import { renderProgressReport } from "@/lib/progress/progressPdf";

export const runtime = "nodejs";
export const maxDuration = 90;

/** Safe on every OS the user might save this to. */
function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "peserta"
  );
}

// GET /api/progress/pdf -- the caller's own lifetime analysis as a PDF.
//
// Rendered on demand and never written to Storage: no extra bucket, no extra
// policy, and no stale copy of someone's history sitting around after they
// delete their recordings. Same posture as /api/client/reports.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: profile }, analysis] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    analyseProgress(supabase, user.id),
  ]);

  const userName = profile?.full_name?.trim() || user.email?.split("@")[0] || "Peserta";

  const buffer = await renderProgressReport({
    userName,
    generatedAt: new Date(),
    analysis,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="analisis-menyeluruh-${slug(userName)}.pdf"`,
      // One person's own history: never let a shared cache hold it.
      "Cache-Control": "private, no-store",
    },
  });
}
