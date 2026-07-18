import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

// Server-only. The dashboard password gate: cookie carries a hash of the
// password so the plaintext never sits in the browser.
// Set ANALYST_PASSWORD in .env.local to override. The literal fallback keeps
// existing logins working, but it is committed to source -- and this gate now
// also guards redeem-code generation (i.e. free subscriptions), so it is worth
// setting the env var. Changing it invalidates old sessions automatically,
// since the cookie token is derived from the password below.
const PASSWORD = process.env.ANALYST_PASSWORD ?? "viboxs";
const SALT = "speaking-pro-analyst-v1";

export const COOKIE_NAME = "analyst_session";

export function sessionToken(): string {
  return createHash("sha256").update(`${SALT}:${PASSWORD}`).digest("hex");
}

export function checkPassword(input: string): boolean {
  return input === PASSWORD;
}

export function isAuthorized(request: NextRequest): boolean {
  return request.cookies.get(COOKIE_NAME)?.value === sessionToken();
}
