import { NextResponse } from "next/server";
import { verifyScryptHash } from "@/lib/analyst/auth";
import {
  CLIENT_COOKIE,
  CLIENT_TTL_SECONDS,
  clientAuthConfigured,
  issueClientToken,
} from "@/lib/client/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/client/login -- {email, password} -> sets the B2B session cookie.
export async function POST(request: Request) {
  if (!clientAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Login dashboard client belum dikonfigurasi. Set CLIENT_SESSION_SECRET di server.",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  // Lowercased on both sides: rows are stored lowercase (see the analyst
  // create route) and the unique index is on lower(email).
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  // Deliberately vague and identical for every failure: a distinct message for
  // "no such account" would turn this endpoint into an email enumerator for
  // whoever is on the client's staff.
  const reject = () =>
    NextResponse.json({ error: "Email atau password salah" }, { status: 401 });

  if (!email || !password) return reject();

  const supabase = createServiceRoleClient();
  const { data: admin } = await supabase
    .from("client_admins")
    .select("id, password_hash, active, must_change_password")
    // .eq, never .ilike: ilike treats % and _ as wildcards, so an "email" of
    // "%" would match the first account in the table and log the caller into
    // someone else's organization.
    .eq("email", email)
    .maybeSingle();

  if (!admin || !verifyScryptHash(password, admin.password_hash)) return reject();
  if (!admin.active) {
    return NextResponse.json(
      { error: "Akun ini sudah dinonaktifkan. Hubungi tim SpeakingPro." },
      { status: 403 },
    );
  }

  await supabase
    .from("client_admins")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", admin.id);

  const res = NextResponse.json({
    ok: true,
    mustChangePassword: admin.must_change_password,
  });
  res.cookies.set(CLIENT_COOKIE, issueClientToken(admin.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    // Path "/" is required, not lax: the dashboard is at /client but its API
    // is at /api/client, and a /client-scoped cookie would never reach the
    // latter. Nothing else reads this cookie name.
    path: "/",
    maxAge: CLIENT_TTL_SECONDS,
  });
  return res;
}

// DELETE /api/client/login -- logout.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CLIENT_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
