import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/analyst/subscriptions -- every user with their subscription
// state; POST toggles it. Both behind the analyst password cookie.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceRoleClient();

  const [{ data: usersData, error: usersError }, { data: profiles }] =
    await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 500 }),
      supabase
        .from("profiles")
        .select("id, full_name, subscription_tier, subscription_renews_at"),
    ]);
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const items = (usersData?.users ?? [])
    .map((u) => {
      const p = byId.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? null,
        subscription_tier: p?.subscription_tier ?? "free",
        subscription_renews_at: p?.subscription_renews_at ?? null,
        created_at: u.created_at,
      };
    })
    .sort((a, b) => {
      // Premium first, then newest signups.
      if (a.subscription_tier !== b.subscription_tier) {
        return a.subscription_tier === "premium" ? -1 : 1;
      }
      return a.created_at < b.created_at ? 1 : -1;
    });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const action = body.action === "activate" ? "activate" : body.action === "deactivate" ? "deactivate" : "";
  const days =
    Number.isFinite(body.days) && body.days > 0 && body.days <= 366
      ? Math.round(body.days)
      : 30;
  if (!userId || !action) {
    return NextResponse.json(
      { error: "userId dan action (activate/deactivate) wajib" },
      { status: 400 },
    );
  }

  const update =
    action === "activate"
      ? {
          subscription_tier: "premium",
          subscription_renews_at: new Date(
            Date.now() + days * 24 * 60 * 60 * 1000,
          ).toISOString(),
        }
      : { subscription_tier: "free", subscription_renews_at: null };

  const { error } = await createServiceRoleClient()
    .from("profiles")
    .update(update)
    .eq("id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
