import { NextResponse, type NextRequest } from "next/server";
import { hashPassword, isAuthorized } from "@/lib/analyst/auth";
import { generateTempPassword, normalizeEmail } from "@/lib/client/credentials";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// CRUD for B2B dashboard accounts, from the /analyst "Client B2B" tab.
//
// The plaintext password is returned exactly once -- at creation and at reset
// -- and is never stored. If the admin loses it, the path forward is another
// reset, not recovery.

const MAX_NAME_LENGTH = 120;

function readName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().slice(0, MAX_NAME_LENGTH);
  return name.length > 0 ? name : null;
}

function readRole(raw: unknown): "owner" | "viewer" {
  return raw === "owner" ? "owner" : "viewer";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const orgId = new URL(request.url).searchParams.get("orgId");

  let query = supabase
    .from("client_admins")
    .select(
      "id, client_org_id, email, full_name, role, active, must_change_password, last_login_at, created_at",
    )
    .order("created_at", { ascending: false });
  if (orgId) query = query.eq("client_org_id", orgId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // password_hash is deliberately absent from the select above: the analyst UI
  // has no use for it and it should not travel over the wire at all.
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const orgId = typeof body.orgId === "string" ? body.orgId : "";
  const email = normalizeEmail(body.email);
  const fullName = readName(body.fullName);
  const role = readRole(body.role);

  if (!orgId) {
    return NextResponse.json({ error: "Client wajib dipilih." }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: org } = await supabase
    .from("client_organizations")
    .select("id, name")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Client tidak ditemukan." }, { status: 404 });
  }

  const password = generateTempPassword();
  const { data: created, error } = await supabase
    .from("client_admins")
    .insert({
      client_org_id: orgId,
      email,
      full_name: fullName,
      password_hash: hashPassword(password),
      role,
    })
    .select("id, email, full_name, role")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Email itu sudah dipakai akun dashboard lain." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    admin: created,
    orgName: org.name,
    // Shown once so the admin can print the credential letter. Never stored.
    password,
  });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: admin } = await supabase
    .from("client_admins")
    .select("id, email, full_name, client_org_id, client_organizations(name)")
    .eq("id", id)
    .maybeSingle();
  if (!admin) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
  }

  if (body.action === "reset-password") {
    const password = generateTempPassword();
    const { error } = await supabase
      .from("client_admins")
      .update({
        password_hash: hashPassword(password),
        // Back to forced-change: the new password travels by PDF again.
        must_change_password: true,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const org = admin.client_organizations as unknown as { name: string } | null;
    return NextResponse.json({
      ok: true,
      password,
      admin: { id: admin.id, email: admin.email, full_name: admin.full_name },
      orgName: org?.name ?? "",
    });
  }

  const update: {
    active?: boolean;
    role?: "owner" | "viewer";
    full_name?: string | null;
  } = {};
  if (typeof body.active === "boolean") update.active = body.active;
  if (body.role !== undefined) update.role = readRole(body.role);
  if (body.fullName !== undefined) update.full_name = readName(body.fullName);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const { error } = await supabase.from("client_admins").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("client_admins").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
