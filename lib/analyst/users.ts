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
  client_org_id: string | null;
  client_org_name: string | null;
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

const PER_PAGE = 500;
// Hard ceiling so a bug upstream can't turn this into an unbounded loop
// against the auth API. 50k accounts is far beyond anything this product
// will hit before the listing needs real pagination in the UI anyway.
const MAX_PAGES = 100;

/**
 * Every auth user, not just the first page.
 *
 * This used to be a single listUsers({ page: 1, perPage: 500 }) call. That is
 * silently wrong the moment the 501st account signs up -- accounts past the
 * cut simply vanish from /analyst, and (since the B2B dashboard filters this
 * same list) a client's participants would start disappearing from their own
 * dashboard with no error anywhere.
 */
async function listAllAuthUsers(
  supabase: ReturnType<typeof createServiceRoleClient>,
): Promise<{ users: { id: string; email?: string; created_at: string }[]; error?: { message: string } }> {
  const users: { id: string; email?: string; created_at: string }[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) return { users, error };
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return { users };
}

export async function listAnalystUsers(): Promise<
  { items: AnalystUserItem[]; error?: undefined } | { items?: undefined; error: string }
> {
  const supabase = createServiceRoleClient();

  const [{ users: authUsers, error: usersError }, { data: profiles }, { data: orgs }] =
    await Promise.all([
      listAllAuthUsers(supabase),
      supabase
        .from("profiles")
        .select(
          "id, full_name, subscription_tier, subscription_renews_at, trial_started_at, trial_ends_at, client_org_id",
        ),
      supabase.from("client_organizations").select("id, name"),
    ]);
  if (usersError) {
    return { error: usersError.message };
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const orgNames = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const items = authUsers
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
        client_org_id: p?.client_org_id ?? null,
        client_org_name: p?.client_org_id
          ? (orgNames.get(p.client_org_id) ?? null)
          : null,
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
