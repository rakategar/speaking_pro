// Web Push sender (VAPID). Used by the queue worker to tell a user their
// analysis is ready. Failures here must never fail the job -- push is
// best-effort; the result is always visible in /history regardless.

import webpush from "web-push";
import { createServiceRoleClient } from "@/lib/supabase/server";

let configured = false;
function ensureConfigured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_CONTACT ?? "mailto:admin@faisalmaulana.site",
      pub,
      priv,
    );
    configured = true;
  }
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<void> {
  if (!ensureConfigured()) return;
  const supabase = createServiceRoleClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          { TTL: 24 * 3600 },
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // Subscription expired or revoked -- clean it up.
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[push] send failed:", status, error);
        }
      }
    }),
  );
}
