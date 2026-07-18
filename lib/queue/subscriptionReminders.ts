// Reminds Premium subscribers a few days before subscription_renews_at, so
// they can renew before losing access. Runs from the same 5-minute gate as
// the other worker.ts jobs. renewal_reminder_sent_at (reset to null by
// activatePremium on every activation/renewal) dedupes so this fires once
// per renewal cycle instead of every 5 minutes during the reminder window.

import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { renewalReminderEmail } from "@/lib/email/templates";
import { notifyUser } from "@/lib/notifications/notify";

const REMINDER_WINDOW_DAYS = 3;

export async function sendSubscriptionRenewalReminders() {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + REMINDER_WINDOW_DAYS * 86_400_000,
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, subscription_renews_at")
    .eq("subscription_tier", "premium")
    .is("renewal_reminder_sent_at", null)
    .not("subscription_renews_at", "is", null)
    .lte("subscription_renews_at", windowEnd.toISOString());
  if (!profiles?.length) return;

  for (const profile of profiles) {
    const renewsAt = new Date(profile.subscription_renews_at!);
    if (renewsAt.getTime() < now.getTime()) continue; // already lapsed, not "upcoming"

    const { data: authUser } = await supabase.auth.admin.getUserById(
      profile.id,
    );
    if (authUser.user?.email) {
      const { subject, html } = renewalReminderEmail(
        profile.full_name,
        renewsAt,
      );
      await sendEmail({ to: authUser.user.email, subject, html });
    }
    await notifyUser(supabase, profile.id, {
      type: "subscription",
      title: "Langganan akan berakhir",
      body: `Premium Anda berakhir ${renewsAt.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}. Perpanjang sekarang.`,
      url: "/subscription/renew",
      icon: "/stickers/faisal-v2/tip-mic.png",
    });

    await supabase
      .from("profiles")
      .update({ renewal_reminder_sent_at: now.toISOString() })
      .eq("id", profile.id);
  }
}
