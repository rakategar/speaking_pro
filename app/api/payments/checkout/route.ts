import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createSnapTransaction,
  midtransConfigured,
  midtransClientKey,
  SNAP_JS_URL,
} from "@/lib/payments/midtrans";

// POST /api/payments/checkout -- create a pending order (and, for 1-on-1, a
// pending booking) for a Pro Shop product and return a Midtrans Snap token.
// Mirrors /api/payments/subscription but takes a productId + buyer contact.
// The webhook payload carries no scheduling data, so the booking (with the
// buyer's preferred dates) is created here and only flipped to 'confirmed' on
// payment (lib/payments/fulfill.ts).
const ALLOWED_TYPES = new Set(["ebook", "1on1"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!midtransConfigured()) {
    return NextResponse.json(
      { error: "Pembayaran belum aktif: MIDTRANS_SERVER_KEY / MIDTRANS_CLIENT_KEY belum diisi." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId : "";
  const customer = body.customer ?? {};
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim() : "";
  const whatsapp =
    typeof customer.whatsapp === "string" ? customer.whatsapp.trim() : "";
  if (!productId || !name || !email || !whatsapp) {
    return NextResponse.json(
      { error: "Nama, email, dan nomor WhatsApp wajib diisi." },
      { status: 400 },
    );
  }

  const { data: product } = await supabase
    .from("coaching_products")
    .select("id, title, type, price_idr")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !ALLOWED_TYPES.has(product.type)) {
    return NextResponse.json(
      { error: "Produk tidak ditemukan atau tidak bisa dibeli di sini." },
      { status: 404 },
    );
  }

  // 1-on-1 booking details
  let preferredDates: string[] = [];
  let domicile = "";
  let topic = "";
  if (product.type === "1on1") {
    const b = body.booking ?? {};
    preferredDates = Array.isArray(b.preferredDates)
      ? b.preferredDates.filter((d: unknown) => typeof d === "string")
      : [];
    domicile = typeof b.domicile === "string" ? b.domicile.trim() : "";
    topic = typeof b.topic === "string" ? b.topic.trim() : "";
    if (preferredDates.length < 2 || !domicile || !topic) {
      return NextResponse.json(
        { error: "Pilih minimal 2 tanggal, isi domisili dan topik." },
        { status: 400 },
      );
    }
  }

  // Buku Speakingpro (ebook) shipping address -- the webhook payload carries
  // no address data, so it's captured here, at checkout-creation time.
  let shippingAddress = "";
  let shippingCity = "";
  let shippingPostalCode = "";
  if (product.type === "ebook") {
    const s = body.shipping ?? {};
    shippingAddress = typeof s.address === "string" ? s.address.trim() : "";
    shippingCity = typeof s.city === "string" ? s.city.trim() : "";
    shippingPostalCode =
      typeof s.postalCode === "string" ? s.postalCode.trim() : "";
    if (!shippingAddress || !shippingCity || !shippingPostalCode) {
      return NextResponse.json(
        { error: "Lengkapi alamat pengiriman (alamat, kota, kode pos)." },
        { status: 400 },
      );
    }
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: product.id,
      product_type: product.type,
      amount_idr: product.price_idr,
      payment_method: "midtrans",
      status: "pending",
      customer_name: name,
      customer_email: email,
      customer_whatsapp: whatsapp,
      shipping_address: product.type === "ebook" ? shippingAddress : null,
      shipping_city: product.type === "ebook" ? shippingCity : null,
      shipping_postal_code: product.type === "ebook" ? shippingPostalCode : null,
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return NextResponse.json(
      { error: orderError?.message ?? "Gagal membuat pesanan" },
      { status: 500 },
    );
  }

  if (product.type === "1on1") {
    const { error: bookingError } = await supabase.from("bookings").insert({
      user_id: user.id,
      product_id: product.id,
      order_id: order.id,
      status: "pending",
      preferred_dates: preferredDates,
      domicile,
      topic,
      customer_whatsapp: whatsapp,
    });
    if (bookingError) {
      await supabase.from("orders").update({ status: "failed" }).eq("id", order.id);
      return NextResponse.json(
        { error: bookingError.message },
        { status: 500 },
      );
    }
  }

  try {
    const snap = await createSnapTransaction({
      orderId: order.id,
      grossAmount: product.price_idr,
      itemName: product.title,
      itemId: product.id,
      customerName: name,
      customerEmail: email,
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
