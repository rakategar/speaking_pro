import { createServiceRoleClient } from "@/lib/supabase/server";

// Server-only. Shared user listing used by both the subscription toggle
// endpoint and the user-management CRUD endpoint on the analyst dashboard.
export type TrialStatusLabel = "premium" | "trial" | "expired" | "not_started";

export type AnalystUserItem = {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: string;
  subscription_renews_at: string | null;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  status: TrialStatusLabel;
  created_at: string;
};

function deriveStatus(
  subscriptionTier: string,
  trialEndsAt: string | null,
): TrialStatusLabel {
  if (subscriptionTier === "premium") return "premium";
  if (!trialEndsAt) return "not_started";
  return new Date(trialEndsAt) > new Date() ? "trial" : "expired";
}

export async function listAnalystUsers(): Promise<
  { items: AnalystUserItem[]; error?: undefined } | { items?: undefined; error: string }
> {
  const supabase = createServiceRoleClient();

  const [{ data: usersData, error: usersError }, { data: profiles }] =
    await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 500 }),
      supabase
        .from("profiles")
        .select(
          "id, full_name, subscription_tier, subscription_renews_at, trial_started_at, trial_ends_at",
        ),
    ]);
  if (usersError) {
    return { error: usersError.message };
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const items = (usersData?.users ?? [])
    .map((u) => {
      const p = byId.get(u.id);
      const subscriptionTier = p?.subscription_tier ?? "free";
      const trialEndsAt = p?.trial_ends_at ?? null;
      return {
        id: u.id,
        email: u.email ?? "",
        full_name: p?.full_name ?? null,
        subscription_tier: subscriptionTier,
        subscription_renews_at: p?.subscription_renews_at ?? null,
        trial_started_at: p?.trial_started_at ?? null,
        trial_ends_at: trialEndsAt,
        status: deriveStatus(subscriptionTier, trialEndsAt),
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

  return { items };
}
