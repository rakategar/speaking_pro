"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary-container/30";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
      {hint ? <span className="text-xs text-text-secondary">{hint}</span> : null}
    </label>
  );
}

// Mints a batch of single-use redeem codes. Each code grants Premium for
// `durationDays` and can be used by exactly one user.
export function TicketGenerateSection({ onGenerated }: { onGenerated?: () => void }) {
  const [prefix, setPrefix] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [durationDays, setDurationDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/analyst/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix,
          quantity: Number(quantity),
          durationDays: Number(durationDays),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        setCodes(json.codes ?? []);
        return;
      }
      setCodes(json.codes ?? []);
      onGenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setError("Gagal menyalin ke clipboard.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stroke-subtle bg-surface-card p-4 shadow-soft">
        <h2 className="mb-3 text-lg font-bold text-primary">
          Generate Kode Ticket{" "}
          <span className="text-sm font-normal text-text-secondary">
            (kode sekali pakai untuk akses Premium gratis)
          </span>
        </h2>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Prefix Kode" hint="Opsional. Contoh: LAUNCH">
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value.toUpperCase())}
              placeholder="LAUNCH"
              className={inputCls}
            />
          </Field>
          <Field label="Jumlah User" hint="Berapa kode yang dibuat (1-500)">
            <input
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Durasi (hari)" hint="Lama akses Premium per kode">
            <input
              type="number"
              min={1}
              max={3650}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={busy}
            className="rounded-full bg-primary-container px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Membuat..." : "Generate Kode"}
          </button>
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
      </div>

      {codes.length > 0 && (
        <div className="rounded-2xl border border-stroke-subtle bg-surface-card shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke-subtle p-3">
            <p className="text-sm font-semibold text-primary">
              {codes.length} kode dibuat
              <span className="ml-2 font-normal text-text-secondary">
                berlaku {durationDays} hari
              </span>
            </p>
            <button
              type="button"
              onClick={copyAll}
              className="rounded-full border border-outline-variant px-4 py-1.5 text-sm font-semibold text-primary hover:bg-surface-container"
            >
              {copied ? "Tersalin ✓" : "Salin Semua"}
            </button>
          </div>
          <div className="max-h-80 overflow-auto p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {codes.map((c) => (
                <span
                  key={c}
                  className="rounded-lg bg-surface-container px-3 py-2 text-center font-mono text-sm tracking-wider text-primary"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
