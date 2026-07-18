import {
  createHmac,
  scryptSync,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import type { NextRequest } from "next/server";

// Auth for the /analyst dashboard.
//
// Credentials live ONLY in the environment -- never in source. An earlier
// version hardcoded the password here, and because this repo is public that
// value is permanently readable in git history; treat anything committed here
// as burned. There is deliberately no fallback: if the env vars are missing
// the dashboard fails closed rather than silently accepting a default.
//
// Middleware exempts /analyst and /api/analyst entirely, so this module is the
// only thing protecting the dashboard -- including redeem-code generation,
// which mints free subscriptions.
//
// Required env (see .env.local):
//   ANALYST_USERNAME        plain username
//   ANALYST_PASSWORD_HASH   "scrypt:<saltHex>:<hashHex>" (generate with scripts/analyst-hash.mjs)
//                           Colon-separated, not "$": dotenv expands $NAME
//                           inside values, which silently ate the hash.
//   ANALYST_SESSION_SECRET  random 32+ byte hex; rotating it logs everyone out

export const COOKIE_NAME = "analyst_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12h

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

/** False when the env isn't set up -- callers should refuse to authenticate. */
export function analystConfigured(): boolean {
  return Boolean(
    env("ANALYST_USERNAME") &&
      env("ANALYST_PASSWORD_HASH") &&
      env("ANALYST_SESSION_SECRET"),
  );
}

// Length-independent equality. timingSafeEqual throws on length mismatch, so
// compare digests of the inputs instead: equal length, no early exit, and no
// leak of how much of the secret matched.
function safeEqual(a: string, b: string): boolean {
  const secret = env("ANALYST_SESSION_SECRET") ?? "";
  const ha = createHmac("sha256", secret).update(a).digest();
  const hb = createHmac("sha256", secret).update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Verifies a username/password pair against the configured hash. */
export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = env("ANALYST_USERNAME");
  const stored = env("ANALYST_PASSWORD_HASH");
  if (!expectedUser || !stored) return false;

  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;

  // Both checks always run: short-circuiting on the username would reveal
  // whether it was correct via response timing.
  const userOk = safeEqual(username, expectedUser);
  let passOk = false;
  try {
    const derived = scryptSync(
      password,
      Buffer.from(saltHex, "hex"),
      32,
    ).toString("hex");
    passOk = safeEqual(derived, hashHex);
  } catch {
    passOk = false;
  }
  return userOk && passOk;
}

/**
 * Mints a signed, expiring session value: `<expiryMs>.<hmac>`. The old scheme
 * was a constant derived from the password, so a leaked cookie was valid
 * forever and there was no way to revoke it. This one expires on its own, and
 * rotating ANALYST_SESSION_SECRET invalidates every outstanding session.
 */
export function issueSessionToken(now: number = Date.now()): string {
  const secret = env("ANALYST_SESSION_SECRET");
  if (!secret) throw new Error("ANALYST_SESSION_SECRET is not set");
  const expiresAt = now + SESSION_TTL_SECONDS * 1000;
  const signature = createHmac("sha256", secret)
    .update(String(expiresAt))
    .digest("hex");
  return `${expiresAt}.${signature}`;
}

export function isAuthorized(request: NextRequest): boolean {
  const secret = env("ANALYST_SESSION_SECRET");
  const raw = request.cookies.get(COOKIE_NAME)?.value;
  if (!secret || !raw) return false;

  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return false;
  const expiresAt = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);

  const expected = createHmac("sha256", secret)
    .update(expiresAt)
    .digest("hex");
  if (!safeEqual(signature, expected)) return false;

  const expiry = Number(expiresAt);
  return Number.isFinite(expiry) && expiry > Date.now();
}

/** Helper for the hash-generation script. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt.toString("hex")}:${hash}`;
}
