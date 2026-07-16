import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  isFailedStatus,
  isPaidStatus,
  midtransConfigured,
  verifyNotificationSignature,
  type MidtransStatus,
} from "@/lib/payments/midtrans";
import { activatePremium } from "@/lib/subscription/activate";

// POST /api/payments/midtrans-notify -- Midtrans HTTP(S) notification
// (webhook). Public path (no session); authenticity comes from the
// sha512 signature. Set this URL in Midtrans Dashboard > Settings >
// Configuration > Payment Notification URL:
//   https://speakingpro.online/api/payments/midtrans-notify
export async function POST(request: Request) {
  if (!midtransConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const notif = (await request.json().catch(() => ({}))) as MidtransStatus;
  if (!verifyNotificationSignature(notif)) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status, product_type")
    .eq("id", notif.order_id!)
    .maybeSingle();
  // Unknown order: acknowledge so Midtrans stops retrying (e.g. dashboard
  // test notifications use fake order ids).
  if (!order) return NextResponse.json({ ok: true });

  if (isPaidStatus(notif) && order.status !== "paid") {
    await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_method: notif.payment_type ?? "midtrans",
      })
      .eq("id", order.id);
    if (order.product_type === "subscription") {
      const renewsAt = new Date();
      renewsAt.setDate(renewsAt.getDate() + 30);
      await activatePremium(supabase, order.user_id, renewsAt);
    }
  } else if (isFailedStatus(notif) && order.status === "pending") {
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id);
  }

  return NextResponse.json({ ok: true });
}
