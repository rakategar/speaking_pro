import { redirect } from "next/navigation";
import { readClientSession } from "@/lib/client/session";
import { listParticipants, recentBroadcastCount } from "@/lib/client/analytics";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { NotifyView } from "@/components/client/NotifyView";

export const dynamic = "force-dynamic";

export default async function NotifyPage() {
  const session = await readClientSession();
  if (!session) redirect("/client/login");

  const supabase = createServiceRoleClient();
  const [participants, sentToday, { data: log }] = await Promise.all([
    listParticipants(session.orgId, 30),
    recentBroadcastCount(session.orgId),
    supabase
      .from("client_notification_log")
      .select("id, title, body, recipient_count, created_at")
      .eq("client_org_id", session.orgId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary">Notifikasi</h1>
        <p className="text-sm text-text-secondary">
          Kirim pengingat atau pengumuman ke peserta organisasi Anda.
        </p>
      </div>
      <NotifyView
        participantCount={participants.length}
        inactiveIds={participants
          .filter((p) => p.status !== "aktif")
          .map((p) => p.userId)}
        history={log ?? []}
        sentToday={sentToday}
      />
    </div>
  );
}
