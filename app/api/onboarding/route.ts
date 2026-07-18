import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_started_at, onboarding_completed, full_name")
    .eq("id", user.id)
    .maybeSingle();

  // Trial clock starts at onboarding completion, not signup -- only for
  // free-tier users who haven't already had a trial window set.
  const trialFields =
    profile?.subscription_tier !== "premium" && !profile?.trial_started_at
      ? {
          trial_started_at: new Date().toISOString(),
          trial_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
        }
      : {};

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarding_answers: answers,
      onboarding_completed: true,
      ...trialFields,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Welcome email, once per user: only on the false->true onboarding
  // transition. Fire-and-forget -- sendEmail swallows its own errors, so a
  // mail failure never affects the onboarding response.
  if (!profile?.onboarding_completed && user.email) {
    const { subject, html } = welcomeEmail(profile?.full_name ?? null);
    await sendEmail({ to: user.email, subject, html });
  }

  return NextResponse.json({ ok: true });
}
