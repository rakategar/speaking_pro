import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { listAnalystUsers } from "@/lib/analyst/users";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// User management CRUD for the analyst dashboard -- all behind the analyst
// password cookie. Passwords are never readable back (Supabase only stores
// a hash); "reset password" sets a brand-new one the admin chooses here.
//
// GET    -- list every user (same shape as /api/analyst/subscriptions)
// POST   -- create a new user {email, password, full_name?}
// PATCH  -- update a user {userId, full_name?, email?, password?}
// DELETE -- remove a user {userId}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await listAnalystUsers();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ items: result.items });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName =
    typeof body.full_name === "string" && body.full_name.trim()
      ? body.full_name.trim()
      : null;

  if (!email || password.length < 6) {
    return NextResponse.json(
      { error: "Email wajib diisi dan password minimal 6 karakter" },
      { status: 400 },
    );
  }

  const { data, error } = await createServiceRoleClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: data.user?.id });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "userId wajib" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : undefined;
  const password = typeof body.password === "string" ? body.password : undefined;
  const fullName =
    typeof body.full_name === "string" ? body.full_name.trim() : undefined;

  if (password !== undefined && password.length < 6) {
    return NextResponse.json(
      { error: "Password minimal 6 karakter" },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  if (email !== undefined || password !== undefined) {
    const attrs: { email?: string; password?: string } = {};
    if (email) attrs.email = email;
    if (password) attrs.password = password;
    const { error } = await supabase.auth.admin.updateUserById(userId, attrs);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (fullName !== undefined) {
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null })
      .eq("id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "userId wajib" }, { status: 400 });
  }

  const { error } = await createServiceRoleClient().auth.admin.deleteUser(
    userId,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
