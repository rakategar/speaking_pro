import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { sendEmail } from "@/lib/email/send";
import {
  paymentFailedEmail,
  subscriptionActivatedEmail,
} from "@/lib/email/templates";
import { renderReceiptPdf, type ReceiptData } from "@/lib/summary/receipt";

/**
 * Flips a profile to premium and sets subscription_renews_at, while only
 * ever setting subscription_started_at once -- so renewals/extensions never
 * reset the weekly-summary anniversary anchored to it. Also resets
 * renewal_reminder_sent_at so the next cycle's expiry reminder can fire
 * again.
 *
 * knownEmail: pass the caller's own email when available (e.g. the client
 * status-recheck route, which already has it from auth.getUser()) so this
 * can run against a plain session-scoped client. Omit it only when calling
 * with a service-role client (e.g. the Midtrans webhook, which has no
 * session) -- that path looks the email up via the admin API instead.
 */
/**
 * Looks up a subscription product's display title for the receipt. Kept
 * separate from the order query because orders.product_id has no PostgREST
 * embed relationship in the generated types. Falls back to a sensible
 * default so a missing product never blocks activation.
 */
export async function getProductTitle(
  supabase: SupabaseClient<Database>,
  productId: string | null,
): Promise<string> {
  if (!productId) return "Speaking Pro Premium";
  const { data } = await supabase
    .from("coaching_products")
    .select("title")
    .eq("id", productId)
    .maybeSingle();
  return data?.title ?? "Speaking Pro Premium";
}

// Order-level fields for the PDF receipt attached to the activation email.
// customerName and renewsAt are filled in by activatePremium from data it
// already has, so callers only supply what the order row carries.
export type ReceiptOrder = {
  orderId: string;
  amountIdr: number;
  paymentMethod: string | null;
  createdAt: Date;
  productTitle: string;
};

export async function activatePremium(
  supabase: SupabaseClient<Database>,
  userId: string,
  renewsAt: Date,
  knownEmail?: string,
  receiptOrder?: ReceiptOrder,
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_started_at")
    .eq("id", userId)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({
      subscription_tier: "premium",
      subscription_renews_at: renewsAt.toISOString(),
      renewal_reminder_sent_at: null,
      ...(profile?.subscription_started_at
        ? {}
        : { subscription_started_at: new Date().toISOString() }),
    })
    .eq("id", userId);

  const email =
    knownEmail ??
    (await supabase.auth.admin.getUserById(userId)).data.user?.email;
  if (email) {
    const { subject, html } = subscriptionActivatedEmail(
      profile?.full_name ?? null,
      renewsAt,
    );
    let attachments: { filename: string; content: Buffer }[] | undefined;
    if (receiptOrder) {
      try {
        const receipt: ReceiptData = {
          ...receiptOrder,
          customerName: profile?.full_name ?? "Sobat Speaking Pro",
          renewsAt,
        };
        const pdf = await renderReceiptPdf(receipt);
        attachments = [{ filename: "bukti-transaksi.pdf", content: pdf }];
      } catch (error) {
        // Receipt is a nice-to-have -- never block the activation email on a
        // PDF render failure.
        console.error("[activate] receipt render failed:", error);
      }
    }
    await sendEmail({ to: email, subject, html, attachments });
  }
}

/**
 * Tells the user a subscription payment failed (Midtrans webhook or client
 * status re-check). Best-effort like activatePremium's email -- a failure
 * here never affects the order status update it's called alongside. See
 * activatePremium's knownEmail note for why it's optional.
 */
export async function notifySubscriptionPaymentFailed(
  supabase: SupabaseClient<Database>,
  userId: string,
  knownEmail?: string,
): Promise<void> {
  const [{ data: profile }, email] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    knownEmail
      ? Promise.resolve(knownEmail)
      : supabase.auth.admin
          .getUserById(userId)
          .then((r) => r.data.user?.email),
  ]);
  if (!email) return;
  const { subject, html } = paymentFailedEmail(profile?.full_name ?? null);
  await sendEmail({ to: email, subject, html });
}
