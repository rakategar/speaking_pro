import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

// Server-only. The dashboard password gate: cookie carries a hash of the
// password so the plaintext never sits in the browser.
const PASSWORD = "viboxs";
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
