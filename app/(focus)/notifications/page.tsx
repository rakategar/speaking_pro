import { createClient } from "@/lib/supabase/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
import {
  NotificationsView,
  type NotificationItem,
} from "@/components/notifications/NotificationsView";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, url, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const items = (data ?? []) as NotificationItem[];

  return (
    <div className="min-h-screen bg-background">
      <TopAppBar variant="back" title="Notifikasi" />
      <main className="pt-32 pb-16 px-margin-mobile max-w-lg mx-auto">
        <NotificationsView items={items} />
      </main>
    </div>
  );
}
