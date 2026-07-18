// Transactional email sender (Resend). Mirrors lib/push/send.ts: a no-op
// until RESEND_API_KEY is set, so every caller can fire-and-forget without
// checking configuration first, and nothing breaks before the sending
// domain is verified.

import { Resend } from "resend";

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer }[];
};

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resend = getClient();
  if (!resend) return;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Speaking Pro <onboarding@resend.dev>";
  try {
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      ...(payload.attachments?.length
        ? { attachments: payload.attachments }
        : {}),
    });
    if (error) console.error("[email] send failed:", error);
  } catch (error) {
    console.error("[email] send failed:", error);
  }
}
