"use client";

import { useState } from "react";

const MAX_TITLE = 80;
const MAX_BODY = 300;

/**
 * Modal composer. Kept deliberately plain: no link field, no HTML, no
 * scheduling. The destination is fixed server-side, and a rich composer here
 * would only suggest capabilities the endpoint refuses.
 */
export function NotifyComposer({
  recipients,
  onClose,
  onSent,
}: {
  /** User ids, or "all" for the whole organization. */
  recipients: string[] | "all";
  onClose: () => void;
  onSent: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const count = recipients === "all" ? "seluruh peserta" : `${recipients.length} peserta`;

  async function send() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/client/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: recipients, title, body }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Gagal mengirim notifikasi");
        return;
      }
      onSent();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl border border-stroke-subtle bg-surface-card p-6 shadow-soft">
        <h2 className="text-lg font-extrabold text-primary">Kirim Notifikasi</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Akan dikirim ke {count}. Pesan muncul di lonceng notifikasi aplikasi
          dan sebagai push di perangkat mereka.
        </p>
        <input
          value={title}
          maxLength={MAX_TITLE}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Judul"
          className="mt-4 w-full rounded-2xl border border-outline-variant bg-surface-card px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
        />
        <textarea
          value={body}
          maxLength={MAX_BODY}
          rows={4}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Isi pesan"
          className="mt-3 w-full rounded-2xl border border-outline-variant bg-surface-card px-4 py-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30"
        />
        <p className="mt-1 text-right text-xs text-text-secondary">
          {body.length}/{MAX_BODY}
        </p>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-stroke-subtle px-4 py-2 text-sm font-semibold text-text-secondary"
          >
            Batal
          </button>
          <button
            onClick={send}
            disabled={busy || !title.trim() || !body.trim()}
            className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Mengirim..." : "Kirim"}
          </button>
        </div>
      </div>
    </div>
  );
}
