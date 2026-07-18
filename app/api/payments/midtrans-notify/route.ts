import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  isFailedStatus,
  isPaidStatus,
  midtransConfigured,
  verifyNotificationSignature,
  type MidtransStatus,
} from "@/lib/payments/midtrans";
import {
  activatePremium,
  getProductTitle,
  notifySubscriptionPaymentFailed,
} from "@/lib/subscription/activate";
import { fulfillOrder } from "@/lib/payments/fulfill";

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
    .select(
      "id, user_id, status, product_type, amount_idr, payment_method, created_at, product_id, customer_name, customer_email, customer_whatsapp, shipping_address, shipping_city, shipping_postal_code",
    )
    .eq("id", notif.order_id!)
    .maybeSingle();
  // Unknown order: acknowledge so Midtrans stops retrying (e.g. dashboard
  // test notifications use fake order ids).
  if (!order) return NextResponse.json({ ok: true });

  if (isPaidStatus(notif) && order.status !== "paid") {
    const paymentMethod = notif.payment_type ?? "midtrans";
    if (order.product_type === "subscription") {
      await supabase
        .from("orders")
        .update({ status: "paid", payment_method: paymentMethod })
        .eq("id", order.id);
      const renewsAt = new Date();
      renewsAt.setDate(renewsAt.getDate() + 30);
      const productTitle = await getProductTitle(supabase, order.product_id);
      await activatePremium(supabase, order.user_id, renewsAt, undefined, {
        orderId: order.id,
        amountIdr: order.amount_idr,
        paymentMethod,
        createdAt: new Date(order.created_at),
        productTitle,
      });
    } else if (
      order.product_type === "ebook" ||
      order.product_type === "1on1" ||
      order.product_type === "quota_topup"
    ) {
      // fulfillOrder owns the paid-claim (atomic, idempotent with the status
      // route), so we do NOT pre-update the order to paid here.
      await fulfillOrder({
        id: order.id,
        user_id: order.user_id,
        product_type: order.product_type,
        product_id: order.product_id,
        amount_idr: order.amount_idr,
        payment_method: paymentMethod,
        created_at: order.created_at,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_whatsapp: order.customer_whatsapp,
        shipping_address: order.shipping_address,
        shipping_city: order.shipping_city,
        shipping_postal_code: order.shipping_postal_code,
      });
    }
  } else if (isFailedStatus(notif) && order.status === "pending") {
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id);
    if (order.product_type === "subscription") {
      await notifySubscriptionPaymentFailed(supabase, order.user_id);
    }
  }

  return NextResponse.json({ ok: true });
}
