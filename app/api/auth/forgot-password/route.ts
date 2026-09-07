import { NextResponse, type NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { APP_URL } from "@/lib/appUrl";

export const runtime = "nodejs";

// Password reset, step 1: mint a GoTrue recovery token and mail it ourselves.
//
// GoTrue on this deployment has no SMTP configured at all, so the usual
// supabase.auth.resetPasswordForEmail() would send nothing. Instead the Admin
// API issues the token (still GoTrue's own token: single use, 1 hour, its own
// verification) and Resend -- already wired for every other transactional mail
// -- delivers it. We build the URL by hand from properties.hashed_token and
// deliberately ignore properties.action_link: GOTRUE_MAILER_URLPATHS_RECOVERY
// points at http://127.0.0.1:54361, which is a dead link in anyone's inbox.
// For the same reason no redirectTo is passed -- the running container's
// GOTRUE_URI_ALLOW_LIST does not include app.speakingpro.online.

// Same reply for every outcome -- registered, unregistered, or throttled.
// Anything that varies turns this endpoint into an account-existence oracle.
const GENERIC = {
  ok: true,
  message:
    "Jika email tersebut terdaftar, kami sudah mengirim link reset password.",
};

// GOTRUE_RATE_LIMIT_EMAIL_SENT is effectively unlimited on this box, so the
// only thing stopping someone from flooding a stranger's inbox (and burning
// the Resend quota) is this. In-process is enough: the app runs as a single
// systemd service, and losing the window on restart only costs one extra mail.
const EMAIL_COOLDOWN_MS = 60_000;
const IP_WINDOW_MS = 60 * 60_000;
const IP_MAX_PER_WINDOW = 10;

const lastSentByEmail = new Map<string, number>();
const sendsByIp = new Map<string, number[]>();

function throttled(email: string, ip: string): boolean {
  const now = Date.now();

  // Drop expired entries so the maps cannot grow without bound.
  for (const [key, at] of lastSentByEmail) {
    if (now - at > EMAIL_COOLDOWN_MS) lastSentByEmail.delete(key);
  }

  const last = lastSentByEmail.get(email);
  if (last !== undefined && now - last < EMAIL_COOLDOWN_MS) return true;

  const recent = (sendsByIp.get(ip) ?? []).filter(
    (at) => now - at < IP_WINDOW_MS,
  );
  if (recent.length >= IP_MAX_PER_WINDOW) {
    sendsByIp.set(ip, recent);
    return true;
  }

  recent.push(now);
  sendsByIp.set(ip, recent);
  lastSentByEmail.set(email, now);
  return false;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  // sendEmail() is a deliberate no-op without this key. Failing loudly here is
  // the difference between "we could not send it" and a permanent silent lie
  // to the user that the link is on its way.
  if (!process.env.RESEND_API_KEY) {
    console.error("[forgot-password] RESEND_API_KEY is not set; cannot send");
    return NextResponse.json(
      { error: "Pengiriman email belum dikonfigurasi. Hubungi admin." },
      { status: 500 },
    );
  }

  let email: string;
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    email = "";
  }
  if (!email || !email.includes("@") || email.length > 254) {
    return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
  }

  if (throttled(email, clientIp(request))) return NextResponse.json(GENERIC);

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email,
  });

  const token = data?.properties?.hashed_token;
  if (error || !token) {
    // Unknown address, or GoTrue refused. Log it, tell the caller nothing.
    console.warn("[forgot-password] generateLink failed:", error?.message);
    return NextResponse.json(GENERIC);
  }

  const url = `${APP_URL}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=recovery`;
  const name =
    (data.user?.user_metadata?.full_name as string | undefined) ?? null;
  const { subject, html } = passwordResetEmail(name, url);
  await sendEmail({ to: email, subject, html });

  return NextResponse.json(GENERIC);
}
