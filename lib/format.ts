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

/**
 * The user-facing "Speaking Level" tier for an average overall score.
 * Shared by the Profile header and the weekly summary PDF so the two can
 * never disagree about what a score means.
 */
export function speakingLevel(avg: number | null): string {
  if (avg === null) return "Pemula";
  if (avg >= 85) return "Advanced Pro";
  if (avg >= 70) return "Intermediate Pro";
  if (avg >= 50) return "Rising Speaker";
  return "Pemula";
}
