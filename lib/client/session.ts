import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// Auth for the /client B2B dashboard.
//
// Same shape as lib/analyst/auth.ts -- a signed, self-expiring cookie -- but a
// separate secret and a separate cookie, so revoking every client session does
// not log out internal admins and vice versa.
//
// Middleware exempts /client and /api/client (see lib/supabase/middleware.ts),
// so this module is the only thing standing between the public internet and
// one organization's participant data.
//
// Required env:
//   CLIENT_SESSION_SECRET  random 32+ byte hex; rotating it logs out every client

export const CLIENT_COOKIE = "client_session";
export const CLIENT_TTL_SECONDS = 60 * 60 * 8; // 8h

export type ClientSession = {
  adminId: string;
  orgId: string;
  role: "owner" | "viewer";
  email: string;
  fullName: string | null;
  mustChangePassword: boolean;
  orgName: string;
  accentColor: string;
};

function secret(): string | undefined {
  const value = process.env.CLIENT_SESSION_SECRET;
  return value && value.length > 0 ? value : undefined;
}

/** False when the env isn't set up -- callers must refuse to authenticate. */
export function clientAuthConfigured(): boolean {
  return Boolean(secret());
}

// Length-independent constant-time compare, same reasoning as the analyst
// module: timingSafeEqual throws on length mismatch, so compare digests.
function safeEqual(a: string, b: string): boolean {
  const key = secret() ?? "";
  const ha = createHmac("sha256", key).update(a).digest();
  const hb = createHmac("sha256", key).update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Mints `<adminId>.<expiryMs>.<hmac>`. */
export function issueClientToken(
  adminId: string,
  now: number = Date.now(),
): string {
  const key = secret();
  if (!key) throw new Error("CLIENT_SESSION_SECRET is not set");
  const expiresAt = now + CLIENT_TTL_SECONDS * 1000;
  const payload = `${adminId}.${expiresAt}`;
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

/**
 * Verifies signature and expiry only. Says nothing about whether the account
 * still exists or is still active -- that is loadSession()'s job.
 */
export function verifyClientToken(raw: string | undefined): string | null {
  const key = secret();
  if (!key || !raw) return null;

  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;
  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 1);
  if (!safeEqual(signature, createHmac("sha256", key).update(payload).digest("hex"))) {
    return null;
  }

  const dot = payload.indexOf(".");
  if (dot <= 0) return null;
  const adminId = payload.slice(0, dot);
  const expiry = Number(payload.slice(dot + 1));
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return null;
  return adminId;
}

/**
 * Token -> live row. The organization is deliberately NOT carried in the
 * cookie: if it were, deactivating an account or moving it to another client
 * would not take effect until the token expired, and anyone holding a copied
 * cookie would keep their access for the rest of the 8 hours. One query per
 * request buys immediate revocation.
 */
async function loadSession(raw: string | undefined): Promise<ClientSession | null> {
  const adminId = verifyClientToken(raw);
  if (!adminId) return null;

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("client_admins")
    .select(
      "id, client_org_id, email, full_name, role, active, must_change_password, client_organizations(name, accent_color)",
    )
    .eq("id", adminId)
    .maybeSingle();
  if (!data || !data.active) return null;

  const org = data.client_organizations as unknown as
    | { name: string; accent_color: string }
    | null;

  return {
    adminId: data.id,
    orgId: data.client_org_id,
    role: data.role === "owner" ? "owner" : "viewer",
    email: data.email,
    fullName: data.full_name,
    mustChangePassword: data.must_change_password,
    orgName: org?.name ?? "Organisasi",
    accentColor: org?.accent_color ?? "#00629d",
  };
}

/** For route handlers. */
export async function requireClientSession(
  request: NextRequest,
): Promise<ClientSession | null> {
  return loadSession(request.cookies.get(CLIENT_COOKIE)?.value);
}

/** For server components, which read cookies via next/headers. */
export async function readClientSession(): Promise<ClientSession | null> {
  const store = await cookies();
  return loadSession(store.get(CLIENT_COOKIE)?.value);
}
