import { randomInt } from "node:crypto";

// Redeem-code shape and validation, shared by the analyst generator and the
// redeem endpoint so both agree on what a valid code looks like.

// Ambiguous glyphs removed (0/O, 1/I/L) -- these codes get read aloud, typed
// off a screenshot, and printed, so O-vs-0 confusion is a real support cost.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const RANDOM_LENGTH = 6;

export const MAX_PREFIX_LENGTH = 12;
export const MAX_BATCH_QUANTITY = 500;
export const MAX_DURATION_DAYS = 3650;

/** Uppercase, strip anything that isn't A-Z/0-9, clamp length. May be "". */
export function sanitizePrefix(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, MAX_PREFIX_LENGTH);
}

/**
 * Normalises user input before lookup: redeem codes are stored uppercase, and
 * people paste them with stray spaces or lowercase.
 */
export function normalizeCode(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function randomPart(): string {
  let out = "";
  for (let i = 0; i < RANDOM_LENGTH; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/**
 * Builds `count` distinct codes, optionally prefixed (`LAUNCH-7K2QX9`).
 * Deduped within the batch here; cross-batch uniqueness is enforced by the
 * table's unique constraint, which the caller retries against.
 */
export function generateCodes(prefix: string, count: number): string[] {
  const codes = new Set<string>();
  // Bounded so a pathological run can't spin forever; the caller surfaces a
  // short batch rather than hanging.
  const maxAttempts = count * 20;
  let attempts = 0;
  while (codes.size < count && attempts < maxAttempts) {
    codes.add(prefix ? `${prefix}-${randomPart()}` : randomPart());
    attempts += 1;
  }
  return [...codes];
}
