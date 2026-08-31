// Round-robins across a pool of Gemini API keys so a quota hit on one key
// doesn't stall every Gemini-backed feature -- ASR, structure scoring, weekly
// narrative, cohort narrative, and the mentor note all share this pool via
// lib/gemini/retry.ts.
//
// Server-only: keys must never reach the client bundle.

type KeyState = { key: string; cooldownUntil: number };

function loadKeys(): string[] {
  const keys: string[] = [];
  const primary = process.env.GEMINI_API_KEY;
  if (primary) keys.push(primary);
  // GEMINI_API_KEY_2, GEMINI_API_KEY_3, ... -- open-ended so adding another
  // key later is one env var, no code change. Stops at the first gap.
  for (let i = 2; ; i += 1) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (!key) break;
    keys.push(key);
  }
  return [...new Set(keys)];
}

// Module-scope singleton, same reasoning as geminiLimiter in ./limiter.ts:
// this must survive re-evaluation across route bundles and the analysis
// worker bundle so the rotation cursor and cooldowns are shared per process,
// not reset on every call.
const globalStore = globalThis as unknown as { __geminiKeyStates?: KeyState[] };
const states: KeyState[] =
  globalStore.__geminiKeyStates ??
  (globalStore.__geminiKeyStates = loadKeys().map((key) => ({ key, cooldownUntil: 0 })));

let cursor = 0;

export function keyCount(): number {
  return states.length;
}

export function hasAvailableKey(): boolean {
  const now = Date.now();
  return states.some((s) => s.cooldownUntil <= now);
}

/**
 * Round-robins to the next key that isn't cooling down. When every key is
 * currently cooling down, returns whichever frees up soonest instead of
 * throwing -- the caller's own backoff (withGeminiRetry) still applies.
 */
export function nextKey(): { key: string; index: number } {
  if (states.length === 0) {
    throw new Error("GEMINI_API_KEY belum dikonfigurasi di server.");
  }
  const now = Date.now();
  for (let i = 0; i < states.length; i += 1) {
    const idx = (cursor + i) % states.length;
    if (states[idx].cooldownUntil <= now) {
      cursor = (idx + 1) % states.length;
      return { key: states[idx].key, index: idx };
    }
  }
  let soonest = 0;
  for (let i = 1; i < states.length; i += 1) {
    if (states[i].cooldownUntil < states[soonest].cooldownUntil) soonest = i;
  }
  cursor = (soonest + 1) % states.length;
  return { key: states[soonest].key, index: soonest };
}

/** Marks a key as exhausted (429) or briefly suspect (5xx). */
export function cooldownKey(index: number, ms: number): void {
  if (!states[index]) return;
  states[index].cooldownUntil = Math.max(states[index].cooldownUntil, Date.now() + ms);
}
