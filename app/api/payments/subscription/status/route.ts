import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTransactionStatus,
  isFailedStatus,
  isPaidStatus,
  midtransConfigured,
} from "@/lib/payments/midtrans";

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
    .select("id, status, product_type")
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
      await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_method: status.payment_type ?? "midtrans",
        })
        .eq("id", order.id);
      await supabase
        .from("profiles")
        .update({
          subscription_tier: "premium",
          subscription_renews_at: renewsAt.toISOString(),
        })
        .eq("id", user.id);
    }
    return NextResponse.json({ status: "paid" });
  }

  if (isFailedStatus(status)) {
    if (order.status === "pending") {
      await supabase
        .from("orders")
        .update({ status: "failed" })
        .eq("id", order.id);
    }
    return NextResponse.json({ status: "failed" });
  }

  return NextResponse.json({
    status: "pending",
    transactionStatus: status.transaction_status ?? "unknown",
  });
}
