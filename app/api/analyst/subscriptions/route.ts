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
//
// POST takes either {userId} or {userIds} for the bulk selection in the user
// management tab. The per-user logic is identical either way -- bulk just
// loops -- so there is only one code path to reason about.

const MAX_BULK = 500;

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
  const userIds: string[] = Array.isArray(body.userIds)
    ? body.userIds
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
        .slice(0, MAX_BULK)
    : typeof body.userId === "string" && body.userId
      ? [body.userId]
      : [];
  const ACTIONS = ["activate", "deactivate", "reset_trial", "extend_trial"] as const;
  const action = ACTIONS.includes(body.action) ? body.action : "";
  const days =
    Number.isFinite(body.days) && body.days > 0 && body.days <= 366
      ? Math.round(body.days)
      : action === "extend_trial"
        ? 7
        : 30;
  if (userIds.length === 0 || !action) {
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
    // re-activation) instead of the generic `update` object below. Sequential
    // because each call also sends an activation email.
    const supabase = createServiceRoleClient();
    const renewsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const failed: string[] = [];
    for (const id of userIds) {
      try {
        await activatePremium(supabase, id, renewsAt);
      } catch {
        failed.push(id);
      }
    }
    return NextResponse.json({ ok: failed.length === 0, activated: userIds.length - failed.length, failed });
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
    .in("id", userIds);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
