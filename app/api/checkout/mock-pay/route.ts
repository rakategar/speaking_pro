import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { activatePremium } from "@/lib/subscription/activate";

// POST /api/checkout/mock-pay -- stub payment gateway. Always succeeds
// after a simulated round-trip; swapping in Midtrans/Xendit later only
// touches this route.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";
  const paymentMethod =
    typeof body.paymentMethod === "string" ? body.paymentMethod : "qris";
  const scheduledAt =
    typeof body.scheduledAt === "string" ? body.scheduledAt : null;

  const { data: product } = await supabase
    .from("coaching_products")
    .select("id, title, type, price_idr")
    .eq("id", productId)
    .maybeSingle();
  if (!product) {
    return NextResponse.json(
      { error: "Produk tidak ditemukan" },
      { status: 404 },
    );
  }

  // Simulated gateway latency.
  await new Promise((r) => setTimeout(r, 1200));

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: product.id,
      product_type: product.type,
      amount_idr: product.price_idr,
      payment_method: paymentMethod,
      status: "paid",
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Gagal membuat pesanan" },
      { status: 500 },
    );
  }

  let bookingId: string | null = null;
  if (product.type === "1on1") {
    const { data: booking } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        product_id: product.id,
        scheduled_at: scheduledAt,
        status: "confirmed",
      })
      .select("id")
      .single();
    bookingId = booking?.id ?? null;
  }

  if (product.type === "subscription") {
    const renewsAt = new Date();
    renewsAt.setDate(renewsAt.getDate() + 30);
    await activatePremium(supabase, user.id, renewsAt);
  }

  return NextResponse.json({
    orderId: order.id,
    bookingId,
    status: "paid",
  });
}
