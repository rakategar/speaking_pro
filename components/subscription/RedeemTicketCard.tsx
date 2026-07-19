"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaisalAvatar } from "@/components/ui/FaisalAvatar";

// Profile card for exchanging a redeem ticket for Premium access. Shown to
// everyone -- an existing subscriber can redeem too, which extends their
// current expiry rather than overwriting it.
export function RedeemTicketCard() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function redeem() {
    const trimmed = code.trim();
    if (busy || !trimmed) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Gagal menukarkan kode.");
        return;
      }
      const until = new Date(json.renewsAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      setSuccess(`Berhasil! Akses Premium Anda aktif sampai ${until}.`);
      setCode("");
      // Refresh so the Premium badge and quota card reflect the new state.
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-surface-card rounded-3xl shadow-soft p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <FaisalAvatar
          expression="finger-heart"
          size={64}
          className="shrink-0 -mt-1"
        />
        <div>
          <h3 className="font-title-lg text-title-lg text-primary">
            Punya Kode Ticket?
          </h3>
          <p className="font-body-md text-body-md text-text-secondary text-sm mt-1">
            Masukkan kode ticket untuk mendapatkan akses langganan gratis.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") void redeem();
          }}
          placeholder="XXXX-XXXX"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={busy}
          className="flex-1 rounded-xl border border-outline-variant bg-surface px-4 py-3 font-mono text-sm tracking-wider text-on-surface placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-secondary-container/30 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={redeem}
          disabled={busy || !code.trim()}
          className="rounded-xl bg-primary-container px-6 py-3 font-label-md text-label-md text-on-primary shadow-md transition active:scale-95 hover:opacity-90 disabled:opacity-50 disabled:active:scale-100"
        >
          {busy ? "Memproses..." : "Tukarkan"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-error-container px-4 py-2.5 font-label-sm text-label-sm text-on-error-container"
        >
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl bg-secondary-container/10 px-4 py-2.5 font-label-sm text-label-sm text-on-tertiary-container">
          {success}
        </p>
      )}
    </section>
  );
}
