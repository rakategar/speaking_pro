import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/components/settings/SettingsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, occupation, subscription_tier, subscription_renews_at")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <SettingsView
      email={user.email ?? ""}
      initialProfile={{
        full_name: profile?.full_name ?? "",
        occupation: profile?.occupation ?? "",
        avatar_url: profile?.avatar_url ?? null,
        subscription_tier: profile?.subscription_tier ?? "free",
        subscription_renews_at: profile?.subscription_renews_at ?? null,
      }}
    />
  );
}
