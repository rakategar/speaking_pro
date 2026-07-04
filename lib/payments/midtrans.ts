import { createHash } from "node:crypto";

// Midtrans Snap integration via plain REST (no SDK dependency).
// Sandbox vs production is switched by MIDTRANS_IS_PRODUCTION;
// keys live in .env.local and are never committed.

const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

const SNAP_BASE = IS_PRODUCTION
  ? "https://app.midtrans.com"
  : "https://app.sandbox.midtrans.com";
const API_BASE = IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

export const SNAP_JS_URL = `${SNAP_BASE}/snap/snap.js`;

export function midtransConfigured(): boolean {
  return Boolean(
    process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY,
  );
}

export function midtransClientKey(): string {
  return process.env.MIDTRANS_CLIENT_KEY ?? "";
}

function authHeader(): string {
  return `Basic ${Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString("base64")}`;
}

export interface SnapTransactionInput {
  orderId: string;
  grossAmount: number;
  itemName: string;
  customerName: string;
  customerEmail: string;
}

// Creates a Snap transaction. `enabled_payments` is intentionally omitted
// so every channel active on the merchant account shows up in the modal.
export async function createSnapTransaction(input: SnapTransactionInput) {
  const res = await fetch(`${SNAP_BASE}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: input.orderId,
        gross_amount: input.grossAmount,
      },
      item_details: [
        {
          id: "subscription-monthly",
          price: input.grossAmount,
          quantity: 1,
          name: input.itemName.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: input.customerName.slice(0, 60),
        email: input.customerEmail,
      },
      credit_card: { secure: true },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const json = (await res.json().catch(() => ({}))) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
  };
  if (!res.ok || !json.token) {
    throw new Error(
      `Midtrans Snap ${res.status}: ${json.error_messages?.join("; ") ?? "no token"}`,
    );
  }
  return { token: json.token, redirectUrl: json.redirect_url ?? "" };
}

export interface MidtransStatus {
  order_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
}

export async function getTransactionStatus(
  orderId: string,
): Promise<MidtransStatus> {
  const res = await fetch(`${API_BASE}/v2/${orderId}/status`, {
    headers: { Accept: "application/json", Authorization: authHeader() },
    signal: AbortSignal.timeout(30_000),
  });
  return (await res.json().catch(() => ({}))) as MidtransStatus;
}

// settlement = fully paid; capture is card-flow "paid" once fraud check passes.
export function isPaidStatus(s: MidtransStatus): boolean {
  return (
    s.transaction_status === "settlement" ||
    (s.transaction_status === "capture" && s.fraud_status !== "deny")
  );
}

export function isFailedStatus(s: MidtransStatus): boolean {
  return ["deny", "cancel", "expire", "failure"].includes(
    s.transaction_status ?? "",
  );
}

// Webhook authenticity: sha512(order_id + status_code + gross_amount + server key).
export function verifyNotificationSignature(n: MidtransStatus): boolean {
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key)
    return false;
  const expected = createHash("sha512")
    .update(
      `${n.order_id}${n.status_code}${n.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`,
    )
    .digest("hex");
  return expected === n.signature_key;
}
