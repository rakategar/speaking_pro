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
// PATCH  -- update a user {userId, full_name?, email?, password?, client_org_id?}
//           or many at once {userIds, client_org_id}
// DELETE -- remove a user {userId} or many at once {userIds}
//
// Bulk mode deliberately accepts only client_org_id: email and password are
// per-user by definition, and applying one of either across a selection would
// be a data-loss bug rather than a feature.

const MAX_BULK = 500;

/** Reads the {userIds} bulk form, or null when the caller used {userId}. */
function readUserIds(body: Record<string, unknown>): string[] | null {
  if (!Array.isArray(body.userIds)) return null;
  const ids = body.userIds.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  return ids.length > 0 ? ids.slice(0, MAX_BULK) : [];
}

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

  // client_org_id is tri-state: absent = leave alone, null = clear the badge,
  // string = assign. `undefined` and `null` mean different things here, so the
  // check is on key presence rather than truthiness.
  const hasClientOrg = "client_org_id" in body;
  const clientOrgId =
    typeof body.client_org_id === "string" && body.client_org_id
      ? body.client_org_id
      : null;

  const bulkIds = readUserIds(body);
  if (bulkIds !== null) {
    if (bulkIds.length === 0) {
      return NextResponse.json({ error: "Tidak ada user dipilih" }, { status: 400 });
    }
    if (!hasClientOrg) {
      return NextResponse.json(
        { error: "Hanya badge client yang bisa diubah massal" },
        { status: 400 },
      );
    }
    const { error } = await createServiceRoleClient()
      .from("profiles")
      .update({ client_org_id: clientOrgId })
      .in("id", bulkIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, updated: bulkIds.length });
  }

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

  if (fullName !== undefined || hasClientOrg) {
    const patch: { full_name?: string | null; client_org_id?: string | null } = {};
    if (fullName !== undefined) patch.full_name = fullName || null;
    if (hasClientOrg) patch.client_org_id = clientOrgId;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
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
  const supabase = createServiceRoleClient();

  const bulkIds = readUserIds(body);
  if (bulkIds !== null) {
    if (bulkIds.length === 0) {
      return NextResponse.json({ error: "Tidak ada user dipilih" }, { status: 400 });
    }
    // Sequential rather than Promise.all: GoTrue's admin API is not something
    // to hammer with 500 concurrent deletes, and a partial result is reported
    // honestly instead of collapsing into one rejected promise.
    let deleted = 0;
    const failed: { id: string; error: string }[] = [];
    for (const id of bulkIds) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) failed.push({ id, error: error.message });
      else deleted += 1;
    }
    return NextResponse.json({ ok: failed.length === 0, deleted, failed });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "userId wajib" }, { status: 400 });
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
