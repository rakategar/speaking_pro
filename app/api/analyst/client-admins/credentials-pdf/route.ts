import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/analyst/auth";
import { renderCredentialsPdf } from "@/lib/client/credentialsPdf";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/analyst/client-admins/credentials-pdf -- the printable credential
// letter.
//
// Pure renderer: it reads the organization's name and nothing else, and never
// touches client_admins. That is what lets the plaintext password stay
// unstored -- the caller passes the value it was handed once at creation, and
// re-issuing later means a reset, not a lookup.

// A bare address, not RESEND_FROM_EMAIL -- that one is "Name <addr>" shaped
// and would print as a broken contact line.
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@speakingpro.online";

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "client"
  );
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const orgId = typeof body.orgId === "string" ? body.orgId : "";
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  const fullName = typeof body.fullName === "string" ? body.fullName : null;
  const isReset = body.isReset === true;

  if (!orgId || !email || !password) {
    return NextResponse.json(
      { error: "orgId, email, dan password wajib diisi." },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: org } = await supabase
    .from("client_organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Client tidak ditemukan." }, { status: 404 });
  }

  // Hardcoded like APP_URL in lib/email/templates.ts, for the same reason:
  // this URL is printed and sent to an external party, and the request origin
  // behind the reverse proxy is localhost:3300, not the address a client can
  // actually open. The env var is an override for staging.
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://app.speakingpro.online"
  ).replace(/\/+$/, "");

  const buffer = await renderCredentialsPdf({
    orgName: org.name,
    fullName,
    email,
    password,
    dashboardUrl: `${origin}/client`,
    supportEmail: SUPPORT_EMAIL,
    issuedAt: new Date(),
    isReset,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kredensial-${slug(org.name)}.pdf"`,
    },
  });
}
