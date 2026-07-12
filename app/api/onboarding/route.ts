import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const REQUIRED_KEYS = [
  "experience_level",
  "practice_frequency",
  "biggest_challenge",
  "speaking_context",
  "weekly_commitment",
] as const;

// POST /api/onboarding -- { answers: Record<string,string> }. Saves the
// first-login questionnaire and flips onboarding_completed so the
// middleware gate (lib/supabase/middleware.ts) stops redirecting here.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const answers = body?.answers;
  const isComplete =
    answers &&
    typeof answers === "object" &&
    REQUIRED_KEYS.every((key) => typeof answers[key] === "string" && answers[key]);

  if (!isComplete) {
    return NextResponse.json(
      { error: "Semua pertanyaan harus dijawab." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_answers: answers, onboarding_completed: true })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
