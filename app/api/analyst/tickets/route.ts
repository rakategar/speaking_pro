import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  generateCodes,
  sanitizePrefix,
  MAX_BATCH_QUANTITY,
  MAX_DURATION_DAYS,
} from "@/lib/tickets/codes";

export const runtime = "nodejs";

// GET  /api/analyst/tickets -- redeem-ticket history (redeemed or not).
// POST /api/analyst/tickets -- mint a batch of single-use codes.
//
// Middleware exempts /api/analyst entirely, so isAuthorized is the ONLY thing
// standing between the open internet and an unlimited free-subscription
// printer. Do not remove these guards.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createServiceRoleClient();
  const { data: tickets, error } = await supabase
    .from("redeem_tickets")
    .select(
      "id, code, batch_label, duration_days, status, redeemed_by, redeemed_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Hydrate the redeemer's name/email the same way the reports inbox does.
  const userIds = [
    ...new Set(
      (tickets ?? [])
        .map((t) => t.redeemed_by)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const emails = new Map<string, string>();
  if (userIds.length) {
    const { data: list } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    for (const u of list?.users ?? []) {
      if (u.email) emails.set(u.id, u.email);
    }
  }

  const items = (tickets ?? []).map((t) => ({
    ...t,
    redeemed_by_name: t.redeemed_by
      ? (profiles?.find((p) => p.id === t.redeemed_by)?.full_name ?? "Pengguna")
      : null,
    redeemed_by_email: t.redeemed_by
      ? (emails.get(t.redeemed_by) ?? null)
      : null,
  }));

  return NextResponse.json({
    items,
    summary: {
      total: items.length,
      redeemed: items.filter((t) => t.status === "redeemed").length,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const prefix = sanitizePrefix(body.prefix);
  const quantity = Number(body.quantity);
  const durationDays = Number(body.durationDays);

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BATCH_QUANTITY) {
    return NextResponse.json(
      { error: `Jumlah user harus 1-${MAX_BATCH_QUANTITY}` },
      { status: 400 },
    );
  }
  if (
    !Number.isInteger(durationDays) ||
    durationDays < 1 ||
    durationDays > MAX_DURATION_DAYS
  ) {
    return NextResponse.json(
      { error: `Durasi harus 1-${MAX_DURATION_DAYS} hari` },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const created: string[] = [];

  // The unique constraint is the source of truth for collisions -- checking
  // "does it exist?" first would be a race. Insert what's left to mint and
  // retry only the codes the DB actually rejected.
  for (let attempt = 0; attempt < 5 && created.length < quantity; attempt += 1) {
    const codes = generateCodes(prefix, quantity - created.length);
    const { data, error } = await supabase
      .from("redeem_tickets")
      .insert(
        codes.map((code) => ({
          code,
          batch_label: prefix || null,
          duration_days: durationDays,
        })),
      )
      .select("code");

    if (!error) {
      created.push(...(data ?? []).map((r) => r.code));
      continue;
    }
    // 23505 = unique_violation: at least one code clashed, so the whole insert
    // rolled back. Loop and try again with fresh codes.
    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (created.length < quantity) {
    return NextResponse.json(
      {
        error: `Hanya ${created.length} dari ${quantity} kode yang berhasil dibuat. Coba lagi atau ganti prefix.`,
        codes: created,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, codes: created, durationDays, prefix });
}
