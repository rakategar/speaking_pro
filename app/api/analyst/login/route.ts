import { NextResponse } from "next/server";
import { checkPassword, sessionToken, COOKIE_NAME } from "@/lib/analyst/auth";

export const runtime = "nodejs";

// POST /api/analyst/login -- {password} -> sets the dashboard session cookie.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12, // 12h
  });
  return res;
}
