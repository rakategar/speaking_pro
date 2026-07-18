import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { activatePremium } from "@/lib/subscription/activate";
import { notifyUser } from "@/lib/notifications/notify";
import { normalizeCode } from "@/lib/tickets/codes";

export const runtime = "nodejs";

// POST /api/redeem { code } -- exchange a redeem ticket for Premium access.
// Unlike /api/analyst/*, this sits behind the normal session middleware.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = normalizeCode(body.code);
  if (!code) {
    return NextResponse.json(
      { error: "Masukkan kode ticket terlebih dahulu." },
      { status: 400 },
    );
  }

  // Service role throughout: redeem_tickets has RLS on with no policies, so a
  // session client can neither read nor claim a ticket.
  const admin = createServiceRoleClient();

  // Atomic single-use claim. Guarding on status='unused' inside the UPDATE is
  // what makes this safe -- a read-then-write would let two users redeem the
  // same code concurrently and both get Premium.
  const { data: claimed, error: claimError } = await admin
    .from("redeem_tickets")
    .update({
      status: "redeemed",
      redeemed_by: user.id,
      redeemed_at: new Date().toISOString(),
    })
    .eq("code", code)
    .eq("status", "unused")
    .select("id, duration_days")
    .maybeSingle();

  if (claimError) {
    return NextResponse.json({ error: claimError.message }, { status: 500 });
  }

  if (!claimed) {
    // Nothing claimed: either the code doesn't exist or it's already spent.
    // Only now do we look, purely to word the error -- correctness already
    // came from the conditional update above.
    const { data: existing } = await admin
      .from("redeem_tickets")
      .select("status")
      .eq("code", code)
      .maybeSingle();
    return NextResponse.json(
      {
        error: existing
          ? "Kode ticket ini sudah pernah digunakan."
          : "Kode ticket tidak ditemukan. Periksa kembali kodenya.",
        reason: existing ? "already_redeemed" : "not_found",
      },
      { status: 400 },
    );
  }

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_renews_at")
      .eq("id", user.id)
      .maybeSingle();

    // Extend from whatever is left rather than overwriting it, so someone who
    // already paid doesn't lose the remainder of their subscription.
    const now = new Date();
    const current = profile?.subscription_renews_at
      ? new Date(profile.subscription_renews_at)
      : null;
    const base = current && current > now ? current : now;
    const renewsAt = new Date(base);
    renewsAt.setDate(renewsAt.getDate() + claimed.duration_days);

    // No receiptOrder: nothing was paid, so there's no transaction to bill.
    await activatePremium(admin, user.id, renewsAt, user.email ?? undefined);

    await notifyUser(admin, user.id, {
      type: "subscription",
      title: "Akses Premium aktif 🎉",
      body: `Kode ticket berhasil ditukar. Premium Anda aktif sampai ${renewsAt.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`,
      url: "/profile",
      icon: "/stickers/faisal-v2/celebrating.png",
    });

    return NextResponse.json({
      ok: true,
      renewsAt: renewsAt.toISOString(),
      durationDays: claimed.duration_days,
    });
  } catch (e) {
    // Activation failed after the ticket was claimed -- hand the code back so
    // it isn't burned for nothing.
    await admin
      .from("redeem_tickets")
      .update({ status: "unused", redeemed_by: null, redeemed_at: null })
      .eq("id", claimed.id);
    console.error("[redeem] activation failed, ticket released:", e);
    return NextResponse.json(
      { error: "Gagal mengaktifkan langganan. Kode Anda belum terpakai, coba lagi." },
      { status: 500 },
    );
  }
}
