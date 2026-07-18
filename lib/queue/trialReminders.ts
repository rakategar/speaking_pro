// Reminds free-tier users a couple of days before their 7-day trial ends,
// so they can subscribe before losing access. Runs from the same 5-minute
// gate as the other worker.ts jobs. trial_reminder_sent_at dedupes so this
// fires once per user during the reminder window instead of every 5 minutes.
// It's never reset -- a trial expires only once per user (unlike the
// subscription renewal reminder, whose flag activatePremium clears).

import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { trialExpiringEmail } from "@/lib/email/templates";
import { notifyUser } from "@/lib/notifications/notify";

const TRIAL_REMINDER_WINDOW_DAYS = 2; // H-2 before trial_ends_at

export async function sendTrialExpiringReminders() {
  const supabase = createServiceRoleClient();
  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + TRIAL_REMINDER_WINDOW_DAYS * 86_400_000,
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, trial_ends_at")
    .eq("subscription_tier", "free")
    .is("trial_reminder_sent_at", null)
    .not("trial_ends_at", "is", null)
    .lte("trial_ends_at", windowEnd.toISOString());
  if (!profiles?.length) return;

  for (const profile of profiles) {
    const endsAt = new Date(profile.trial_ends_at!);
    if (endsAt.getTime() < now.getTime()) continue; // already expired, not "upcoming"

    const { data: authUser } = await supabase.auth.admin.getUserById(
      profile.id,
    );
    if (authUser.user?.email) {
      const { subject, html } = trialExpiringEmail(profile.full_name, endsAt);
      await sendEmail({ to: authUser.user.email, subject, html });
    }
    await notifyUser(supabase, profile.id, {
      type: "trial",
      title: "Uji coba gratis akan berakhir",
      body: `Trial-mu berakhir ${endsAt.toLocaleDateString("id-ID", { day: "numeric", month: "long" })}. Langganan sekarang agar tetap bisa berlatih.`,
      url: "/subscription/renew",
      icon: "/stickers/faisal-v2/tip-mic.png",
    });

    await supabase
      .from("profiles")
      .update({ trial_reminder_sent_at: now.toISOString() })
      .eq("id", profile.id);
  }
}
