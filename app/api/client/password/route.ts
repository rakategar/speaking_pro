import { NextResponse, type NextRequest } from "next/server";
import { hashPassword, verifyScryptHash } from "@/lib/analyst/auth";
import { requireClientSession } from "@/lib/client/session";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export const MIN_PASSWORD_LENGTH = 10;

// POST /api/client/password -- first-login password change, and any later one.
// Required because the initial credential travels to the client as a PDF: it
// passes through email and print, so it has to stop working once used.
export async function POST(request: NextRequest) {
  const session = await requireClientSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.` },
      { status: 400 },
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json(
      { error: "Password baru harus berbeda dari password lama." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: admin } = await supabase
    .from("client_admins")
    .select("password_hash")
    .eq("id", session.adminId)
    .maybeSingle();
  if (!admin || !verifyScryptHash(currentPassword, admin.password_hash)) {
    return NextResponse.json({ error: "Password lama salah" }, { status: 401 });
  }

  const { error } = await supabase
    .from("client_admins")
    .update({
      password_hash: hashPassword(newPassword),
      must_change_password: false,
    })
    .eq("id", session.adminId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
