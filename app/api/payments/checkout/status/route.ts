import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTransactionStatus,
  isFailedStatus,
  isPaidStatus,
  midtransConfigured,
} from "@/lib/payments/midtrans";
import { fulfillOrder } from "@/lib/payments/fulfill";

// POST /api/payments/checkout/status { orderId } -- re-check a Pro Shop order
// against Midtrans and fulfill it when paid. Called from the Snap
// onSuccess/onPending callbacks so fulfillment works even before the webhook
// fires. fulfillOrder is idempotent (atomic paid-claim), so this racing with
// the webhook is safe.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!midtransConfigured()) {
    return NextResponse.json({ error: "Midtrans belum aktif" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib" }, { status: 400 });
  }

  // RLS "own orders" scopes this to the caller's order.
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, user_id, product_type, product_id, amount_idr, payment_method, created_at, status, customer_name, customer_email, customer_whatsapp, shipping_address, shipping_city, shipping_postal_code",
    )
    .eq("id", orderId)
    .neq("product_type", "subscription")
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  }

  const status = await getTransactionStatus(orderId);

  if (isPaidStatus(status)) {
    await fulfillOrder({
      id: order.id,
      user_id: order.user_id,
      product_type: order.product_type,
      product_id: order.product_id,
      amount_idr: order.amount_idr,
      payment_method: status.payment_type ?? order.payment_method,
      created_at: order.created_at,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_whatsapp: order.customer_whatsapp,
      shipping_address: order.shipping_address,
      shipping_city: order.shipping_city,
      shipping_postal_code: order.shipping_postal_code,
    });
    return NextResponse.json({ status: "paid" });
  }

  if (isFailedStatus(status)) {
    if (order.status === "pending") {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    }
    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({
    status: "pending",
    transactionStatus: status.transaction_status ?? "unknown",
  });
}
