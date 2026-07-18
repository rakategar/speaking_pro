import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTransactionStatus,
  isFailedStatus,
  isPaidStatus,
  midtransConfigured,
} from "@/lib/payments/midtrans";
import {
  activatePremium,
  getProductTitle,
  notifySubscriptionPaymentFailed,
} from "@/lib/subscription/activate";

// POST /api/payments/subscription/status { orderId } -- re-check the order
// against Midtrans and activate the subscription when paid. Called from the
// Snap onSuccess/onPending callbacks so activation works even before the
// webhook URL is configured in the Midtrans dashboard.
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

  // RLS "own orders" guarantees this only matches the caller's order.
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, product_type, amount_idr, payment_method, created_at, product_id",
    )
    .eq("id", orderId)
    .eq("product_type", "subscription")
    .maybeSingle();
  if (!order) {
    return NextResponse.json(
      { error: "Pesanan tidak ditemukan" },
      { status: 404 },
    );
  }

  const status = await getTransactionStatus(orderId);

  if (isPaidStatus(status)) {
    if (order.status !== "paid") {
      const renewsAt = new Date();
      renewsAt.setDate(renewsAt.getDate() + 30);
      const paymentMethod = status.payment_type ?? "midtrans";
      await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_method: paymentMethod,
        })
        .eq("id", order.id);
      const productTitle = await getProductTitle(supabase, order.product_id);
      await activatePremium(supabase, user.id, renewsAt, user.email, {
        orderId: order.id,
        amountIdr: order.amount_idr,
        paymentMethod,
        createdAt: new Date(order.created_at),
        productTitle,
      });
    }
    return NextResponse.json({ status: "paid" });
  }

  if (isFailedStatus(status)) {
    if (order.status === "pending") {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order.id);
      await notifySubscriptionPaymentFailed(supabase, user.id, user.email);
    }
    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({
    status: "pending",
    transactionStatus: status.transaction_status ?? "unknown",
  });
}
