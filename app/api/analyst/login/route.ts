import { NextResponse } from "next/server";
import {
  analystConfigured,
  checkCredentials,
  issueSessionToken,
  COOKIE_NAME,
  SESSION_TTL_SECONDS,
} from "@/lib/analyst/auth";

export const runtime = "nodejs";

// POST /api/analyst/login -- {username, password} -> sets the session cookie.
export async function POST(request: Request) {
  if (!analystConfigured()) {
    return NextResponse.json(
      {
        error:
          "Login analyst belum dikonfigurasi. Set ANALYST_USERNAME, ANALYST_PASSWORD_HASH, dan ANALYST_SESSION_SECRET di .env.local.",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!checkCredentials(username, password)) {
    // Deliberately vague: don't reveal which half was wrong.
    return NextResponse.json(
      { error: "Username atau password salah" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, issueSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

// POST /api/analyst/logout -- there was previously no way to end a session.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
