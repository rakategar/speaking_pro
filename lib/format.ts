export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/** Compact "Rp 99k" style used on Pro Shop cards. */
export function formatRupiahCompact(amount: number): string {
  if (amount >= 1_000_000) {
    const juta = amount / 1_000_000;
    return `Rp ${Number.isInteger(juta) ? juta : juta.toFixed(1)}jt`;
  }
  if (amount >= 1_000) return `Rp ${Math.round(amount / 1_000)}k`;
  return `Rp ${amount}`;
}
