import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/drills/complete -- logs a finished local drill (AIUEO, pitch,
// breathing) as a recordings row without audio, so it counts toward the
// weekly streak on the dashboard.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const moduleSlug = typeof body.moduleSlug === "string" ? body.moduleSlug : "";
  const durationSeconds = Number(body.durationSeconds) || null;

  const { data: module } = await supabase
    .from("practice_modules")
    .select("id")
    .eq("slug", moduleSlug)
    .maybeSingle();
  if (!module) {
    return NextResponse.json(
      { error: "Modul tidak ditemukan" },
      { status: 404 },
    );
  }

  const { error } = await supabase.from("recordings").insert({
    user_id: user.id,
    module_id: module.id,
    duration_seconds: durationSeconds,
    status: "drill_completed",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
