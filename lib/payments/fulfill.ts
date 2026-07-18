// Fulfills a paid Pro Shop order (e-book or 1-on-1): delivers to the buyer
// (email + PDF receipt), records an in-app notification + push, and emails the
// sale to Faisal. Called from both the Midtrans webhook and the client
// status-recheck route, so it owns an atomic paid-claim for idempotency and
// always uses its own service-role client for writes (the status route runs
// under a session client that RLS would block from inserting notifications).

import { createServiceRoleClient } from "@/lib/supabase/server";
import { renderReceiptPdf, type ReceiptData } from "@/lib/summary/receipt";
import { sendEmail } from "@/lib/email/send";
import { notifyUser } from "@/lib/notifications/notify";
import {
  bookShippingConfirmationEmail,
  bookingConfirmationEmail,
  quotaTopupEmail,
  saleNotificationEmail,
} from "@/lib/email/templates";
import { TOPUP_BLOCK_SECONDS, TOPUP_PRODUCT_TYPE } from "@/lib/recording/quota";

const SALES_NOTIFY_EMAIL =
  process.env.SALES_NOTIFY_EMAIL ?? "faisalmaulana777@gmail.com";

export type FulfillableOrder = {
  id: string;
  user_id: string;
  product_type: string;
  product_id: string | null;
  amount_idr: number;
  payment_method: string | null;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_whatsapp: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
};

export async function fulfillOrder(order: FulfillableOrder): Promise<void> {
  const supabase = createServiceRoleClient();

  // Atomic paid-claim: only the first caller (webhook or status route) that
  // flips pending->paid proceeds; a concurrent/duplicate call no-ops.
  const paymentMethod = order.payment_method ?? "midtrans";
  const { data: claimed } = await supabase
    .from("orders")
    .update({ status: "paid", payment_method: paymentMethod })
    .eq("id", order.id)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();
  if (!claimed) return;

  const { data: product } = await supabase
    .from("coaching_products")
    .select("title")
    .eq("id", order.product_id ?? "")
    .maybeSingle();
  const productTitle = product?.title ?? "Produk Speaking Pro";
  const customerName = order.customer_name?.trim() || "Sobat Speaking Pro";

  const receipt: ReceiptData = {
    orderId: order.id,
    amountIdr: order.amount_idr,
    paymentMethod,
    createdAt: new Date(order.created_at),
    productTitle,
    customerName,
  };
  let attachments: { filename: string; content: Buffer }[] | undefined;
  try {
    const pdf = await renderReceiptPdf(receipt);
    attachments = [{ filename: "bukti-transaksi.pdf", content: pdf }];
  } catch (error) {
    console.error("[fulfill] receipt render failed:", error);
  }

  if (order.product_type === "1on1") {
    await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("order_id", order.id);
    const { data: booking } = await supabase
      .from("bookings")
      .select("preferred_dates, topic, domicile")
      .eq("order_id", order.id)
      .maybeSingle();
    const preferredDates = Array.isArray(booking?.preferred_dates)
      ? (booking!.preferred_dates as string[])
      : [];

    if (order.customer_email) {
      const { subject, html } = bookingConfirmationEmail(
        customerName,
        preferredDates,
        booking?.topic ?? null,
      );
      await sendEmail({ to: order.customer_email, subject, html, attachments });
    }
    await notifyUser(supabase, order.user_id, {
      type: "purchase",
      title: "Sesi 1-on-1 dipesan 🎉",
      body: "Terima kasih! Tim kami akan menghubungi Anda via WhatsApp untuk konfirmasi jadwal.",
      url: "/pro-shop",
      icon: "/stickers/faisal-v2/approve-mic.png",
    });
    await sendEmail({
      to: SALES_NOTIFY_EMAIL,
      ...saleNotificationEmail({
        productTitle,
        customerName,
        customerEmail: order.customer_email ?? "-",
        customerWhatsapp: order.customer_whatsapp,
        amountIdr: order.amount_idr,
        orderId: order.id,
        bookingInfo: {
          preferredDates,
          domicile: booking?.domicile ?? null,
          topic: booking?.topic ?? null,
        },
      }),
    });
    return;
  }

  // Recording quota top-up: credit the purchased seconds. Must stay ahead of
  // the book default below -- falling through would email the buyer a
  // shipping confirmation for a product that has nothing to ship. The
  // paid-claim above makes the credit idempotent against webhook retries.
  if (order.product_type === TOPUP_PRODUCT_TYPE) {
    const { error: creditError } = await supabase.rpc("add_topup_seconds", {
      p_user_id: order.user_id,
      p_seconds: TOPUP_BLOCK_SECONDS,
    });
    if (creditError) {
      // Loud: the user paid and the credit didn't land, so it needs manual
      // repair. The order stays 'paid' -- re-crediting is safer done by hand
      // than by a retry that could double-credit.
      console.error(
        `[fulfill] quota credit FAILED for order ${order.id} (user ${order.user_id}):`,
        creditError,
      );
    }

    const minutes = Math.round(TOPUP_BLOCK_SECONDS / 60);
    if (order.customer_email) {
      const { subject, html } = quotaTopupEmail(customerName, minutes);
      await sendEmail({ to: order.customer_email, subject, html, attachments });
    }
    await notifyUser(supabase, order.user_id, {
      type: "quota",
      title: `Kuota rekaman +${minutes} menit 🎉`,
      body: "Terima kasih! Kuota tambahan sudah masuk dan bisa langsung dipakai merekam.",
      url: "/profile",
      icon: "/stickers/faisal-v2/thumbs-up.png",
    });
    await sendEmail({
      to: SALES_NOTIFY_EMAIL,
      ...saleNotificationEmail({
        productTitle,
        customerName,
        customerEmail: order.customer_email ?? "-",
        customerWhatsapp: order.customer_whatsapp,
        amountIdr: order.amount_idr,
        orderId: order.id,
      }),
    });
    return;
  }

  // Default: Buku Speakingpro (physical book, shipped to the buyer's address).
  const shipping = {
    address: order.shipping_address ?? "-",
    city: order.shipping_city ?? "-",
    postalCode: order.shipping_postal_code ?? "-",
  };
  if (order.customer_email) {
    const { subject, html } = bookShippingConfirmationEmail(customerName, shipping);
    await sendEmail({ to: order.customer_email, subject, html, attachments });
  }
  await notifyUser(supabase, order.user_id, {
    type: "purchase",
    title: "Buku Speakingpro berhasil dipesan 🎉",
    body: "Terima kasih! Buku akan segera dikirim ke alamat Anda.",
    url: "/pro-shop",
    icon: "/stickers/faisal-v2/celebrating.png",
  });
  await sendEmail({
    to: SALES_NOTIFY_EMAIL,
    ...saleNotificationEmail({
      productTitle,
      customerName,
      customerEmail: order.customer_email ?? "-",
      customerWhatsapp: order.customer_whatsapp,
      amountIdr: order.amount_idr,
      orderId: order.id,
      shippingInfo: shipping,
    }),
  });
}
