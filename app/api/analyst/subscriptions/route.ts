import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { listAnalystUsers } from "@/lib/analyst/users";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { activatePremium } from "@/lib/subscription/activate";
import type { Database } from "@/lib/types/database";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export const runtime = "nodejs";

// GET /api/analyst/subscriptions -- every user with their subscription
// state; POST toggles it. Both behind the analyst password cookie.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await listAnalystUsers();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ items: result.items });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const ACTIONS = ["activate", "deactivate", "reset_trial", "extend_trial"] as const;
  const action = ACTIONS.includes(body.action) ? body.action : "";
  const days =
    Number.isFinite(body.days) && body.days > 0 && body.days <= 366
      ? Math.round(body.days)
      : action === "extend_trial"
        ? 7
        : 30;
  if (!userId || !action) {
    return NextResponse.json(
      {
        error:
          "userId dan action (activate/deactivate/reset_trial/extend_trial) wajib",
      },
      { status: 400 },
    );
  }

  if (action === "activate") {
    // Uses the shared helper (sets subscription_started_at once, never on
    // re-activation) instead of the generic `update` object below.
    await activatePremium(
      createServiceRoleClient(),
      userId,
      new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    );
    return NextResponse.json({ ok: true });
  }

  let update: ProfileUpdate;
  if (action === "deactivate") {
    update = { subscription_tier: "free", subscription_renews_at: null };
  } else if (action === "reset_trial") {
    // Fresh 7-day window (support/goodwill case for a lapsed free user).
    update = {
      trial_started_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  } else {
    // extend_trial: push the deadline out without touching
    // trial_started_at, so already-unlocked modules stay unlocked.
    update = {
      trial_ends_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const { error } = await createServiceRoleClient()
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
