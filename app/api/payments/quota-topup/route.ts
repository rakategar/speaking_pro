import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSnapTransaction,
  midtransConfigured,
  midtransClientKey,
  SNAP_JS_URL,
} from "@/lib/payments/midtrans";
import { TOPUP_PRODUCT_TYPE } from "@/lib/recording/quota";

// POST /api/payments/quota-topup -- create a pending order for one 5-minute
// recording top-up and return a Midtrans Snap token.
//
// Deliberately separate from /api/payments/checkout: that route requires
// customer name/email/whatsapp for physical delivery, which a top-up has no
// use for. This mirrors /api/payments/subscription instead, filling the
// customer details from the session.
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, subscription_tier")
    .eq("id", user.id)
    .maybeSingle();

  // The quota only exists for Premium, so selling top-ups to anyone else
  // would take money for something they can't spend.
  if (profile?.subscription_tier !== "premium") {
    return NextResponse.json(
      {
        error:
          "Tambah kuota hanya tersedia untuk pengguna Premium. Berlangganan dulu untuk membuka fitur ini.",
      },
      { status: 403 },
    );
  }

  const { data: product } = await supabase
    .from("coaching_products")
    .select("id, title, price_idr")
    .eq("type", TOPUP_PRODUCT_TYPE)
    .order("price_idr")
    .limit(1)
    .maybeSingle();
  if (!product) {
    return NextResponse.json(
      { error: "Produk tambah kuota tidak ditemukan" },
      { status: 404 },
    );
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: product.id,
      product_type: TOPUP_PRODUCT_TYPE,
      amount_idr: product.price_idr,
      payment_method: "midtrans",
      status: "pending",
      customer_name: profile?.full_name ?? null,
      customer_email: user.email ?? null,
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
      grossAmount: product.price_idr,
      itemName: product.title,
      itemId: TOPUP_PRODUCT_TYPE,
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
    await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Midtrans error" },
      { status: 502 },
    );
  }
}
