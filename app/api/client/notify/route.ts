import { NextResponse, type NextRequest } from "next/server";
import { requireClientSession } from "@/lib/client/session";
import { listOrgMembers, assertMember } from "@/lib/client/analytics";
import { notifyUser } from "@/lib/notifications/notify";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Broadcasts from a client organization to its own participants.
//
// This is the only endpoint in the product that lets someone outside
// SpeakingPro put a message on a user's device, so it is fenced accordingly:
// membership is re-checked per recipient, the destination URL is fixed, the
// text is capped and stripped, sends are rate-limited per day, and every send
// is logged where the client can see it.

const MAX_TITLE = 80;
const MAX_BODY = 300;
const MAX_RECIPIENTS = 500;
const MAX_BROADCASTS_PER_DAY = 5;

/** Plain text only -- this ends up in an OS notification, not in a web page. */
function clean(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function GET(request: NextRequest) {
  const session = await requireClientSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("client_notification_log")
    .select("id, title, body, recipient_count, created_at")
    .eq("client_org_id", session.orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const session = await requireClientSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = clean(body.title, MAX_TITLE);
  const message = clean(body.body, MAX_BODY);

  if (!title || !message) {
    return NextResponse.json(
      { error: "Judul dan isi notifikasi wajib diisi." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();

  // Rate limit before doing any work: a client with a stuck button should hit
  // this, not 500 push sends.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("client_notification_log")
    .select("id", { count: "exact", head: true })
    .eq("client_org_id", session.orgId)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_BROADCASTS_PER_DAY) {
    return NextResponse.json(
      {
        error: `Batas ${MAX_BROADCASTS_PER_DAY} pengiriman per 24 jam sudah tercapai. Coba lagi besok.`,
      },
      { status: 429 },
    );
  }

  let recipients: string[];
  if (body.userIds === "all") {
    recipients = (await listOrgMembers(session.orgId)).map((m) => m.id);
  } else if (Array.isArray(body.userIds)) {
    const requested = body.userIds
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
      .slice(0, MAX_RECIPIENTS);
    // Re-check every id rather than trusting the list the browser sent: this
    // is what stops one client from paging another client's participants.
    const checks = await Promise.all(
      requested.map(async (id: string) => ((await assertMember(session.orgId, id)) ? id : null)),
    );
    recipients = checks.filter((id): id is string => id !== null);
    if (recipients.length !== requested.length) {
      return NextResponse.json(
        { error: "Ada peserta yang tidak terdaftar di organisasi Anda." },
        { status: 403 },
      );
    }
  } else {
    return NextResponse.json({ error: "Penerima tidak valid." }, { status: 400 });
  }

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada peserta yang dipilih." },
      { status: 400 },
    );
  }

  let sent = 0;
  const failed: string[] = [];
  for (const userId of recipients) {
    try {
      await notifyUser(supabase, userId, {
        type: "client_broadcast",
        title,
        body: message,
        // Fixed, never taken from the request: a client-supplied URL would
        // make this a first-class phishing channel into their own staff.
        url: "/dashboard",
      });
      sent += 1;
    } catch (error) {
      console.error("[client-notify] failed for", userId, error);
      failed.push(userId);
    }
  }

  await supabase.from("client_notification_log").insert({
    client_org_id: session.orgId,
    client_admin_id: session.adminId,
    title,
    body: message,
    recipient_count: sent,
  });

  return NextResponse.json({ ok: true, sent, failed: failed.length });
}
