import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSnapTransaction,
  midtransConfigured,
  midtransClientKey,
  SNAP_JS_URL,
} from "@/lib/payments/midtrans";

// POST /api/payments/subscription -- create a pending order for the monthly
// subscription and return a Midtrans Snap token for the payment modal.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!midtransConfigured()) {
    return NextResponse.json(
      {
        error:
          "Pembayaran belum aktif: MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY belum diisi di .env.local.",
      },
      { status: 503 },
    );
  }

  const { data: plan } = await supabase
    .from("coaching_products")
    .select("id, title, price_idr")
    .eq("type", "subscription")
    .order("price_idr")
    .limit(1)
    .maybeSingle();
  if (!plan) {
    return NextResponse.json(
      { error: "Paket langganan tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: plan.id,
      product_type: "subscription",
      amount_idr: plan.price_idr,
      payment_method: "midtrans",
      status: "pending",
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Gagal membuat pesanan" },
      { status: 500 },
    );
  }

  try {
    const snap = await createSnapTransaction({
      orderId: order.id,
      grossAmount: plan.price_idr,
      itemName: plan.title,
      customerName: profile?.full_name ?? user.email ?? "Speaker",
      customerEmail: user.email ?? "user@speakingpro.online",
    });
    return NextResponse.json({
      token: snap.token,
      redirectUrl: snap.redirectUrl,
      orderId: order.id,
      clientKey: midtransClientKey(),
      snapJsUrl: SNAP_JS_URL,
    });
  } catch (e) {
    await supabase
      .from("orders")
      .update({ status: "failed" })
      .eq("id", order.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Midtrans error" },
      { status: 502 },
    );
  }
}
