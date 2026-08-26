import { randomInt } from "node:crypto";

// Temporary passwords for B2B dashboard accounts.
//
// Same reasoning as the redeem-code alphabet in lib/tickets/codes.ts: this
// string gets printed in a PDF, read off a screen, and typed by hand, so the
// glyphs that get confused (0/O, 1/I/l) are removed. Groups of four with
// hyphens because a 16-character run with no structure is where transcription
// errors happen.

const UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGITS = "23456789";
const ALPHABET = UPPER + LOWER + DIGITS;

const GROUPS = 4;
const GROUP_SIZE = 4;

/** A 16-character password formatted as `Abcd-2Efg-Hjk3-Mnpq`. */
export function generateTempPassword(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g += 1) {
    let group = "";
    for (let i = 0; i < GROUP_SIZE; i += 1) {
      group += ALPHABET[randomInt(ALPHABET.length)];
    }
    groups.push(group);
  }
  return groups.join("-");
}

export const MAX_EMAIL_LENGTH = 160;

/** Loose on purpose: this rejects typos, not exotic-but-valid addresses. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}
