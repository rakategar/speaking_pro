// One call = one in-app notification (feeds the TopAppBar bell / the
// /notifications center) plus a best-effort Chrome push. Replaces bare
// sendPushToUser calls across the worker jobs so every push also leaves a
// durable, per-user record the bell can show. Insert uses whatever client is
// passed (the jobs already hold a service-role client, which bypasses RLS);
// push stays best-effort and never throws.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { sendPushToUser } from "@/lib/push/send";

export type NotifyPayload = {
  type: string;
  title: string;
  body: string;
  url: string;
  icon?: string;
};

export async function notifyUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      url: payload.url,
    });
  } catch (error) {
    // A notification-record failure must never break the job that emitted it.
    console.error("[notify] insert failed:", error);
  }
  // The settings toggle scopes only push delivery -- the in-app record above
  // is the user's own history and is always kept. Read failures fall through
  // to sending, matching the rest of this function's best-effort posture.
  const { data: profile } = await supabase
    .from("profiles")
    .select("notif_push")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.notif_push === false) return;

  await sendPushToUser(userId, {
    title: payload.title,
    body: payload.body,
    url: payload.url,
    icon: payload.icon,
  });
}
