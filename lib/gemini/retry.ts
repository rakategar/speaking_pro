// Shared retry + key-rotation for Gemini calls. The free tier enforces a
// per-minute request quota per key, so a burst of concurrent analyses gets
// 429s; rotating to a different configured key (see ./keys.ts) turns most of
// those into an immediate retry instead of a wait, and waiting the advertised
// retryDelay only kicks in once every key is cooling down.

import { cooldownKey, hasAvailableKey, keyCount, nextKey } from "./keys";

export type HttpError = Error & { status?: number };

const MAX_ATTEMPTS = 4;
const DEFAULT_COOLDOWN_MS = 60_000;

function parseRetryDelayMs(message: string): number | null {
  const m = message.match(/retryDelay[^0-9]*([0-9]+(?:\.[0-9]+)?)s/);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

/**
 * Runs `fn` with a rotated API key, retrying on 429/5xx. Each attempt draws
 * the next non-cooling-down key from the pool; a retryable failure puts that
 * key in cooldown so the next attempt prefers a different one. Only sleeps
 * when no key is currently available -- with N keys configured, one key's
 * quota hit costs at most one failed attempt, not a stalled feature.
 */
export async function withGeminiRetry<T>(
  label: string,
  fn: (key: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { key, index } = nextKey();
    try {
      return await fn(key);
    } catch (error) {
      lastError = error;
      const status = (error as HttpError).status;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || attempt === MAX_ATTEMPTS) throw error;

      const advertised = parseRetryDelayMs(String((error as Error).message));
      cooldownKey(index, advertised ?? DEFAULT_COOLDOWN_MS);

      if (keyCount() > 1 && hasAvailableKey()) {
        console.warn(
          `[gemini] ${label} attempt ${attempt} got ${status} on key #${index + 1}/${keyCount()}, rotating to next key`,
        );
        continue;
      }

      const delay = (advertised ?? 15_000 * attempt) + Math.random() * 5_000;
      console.warn(
        `[gemini] ${label} attempt ${attempt} got ${status} (all ${keyCount()} key(s) cooling down), retrying in ${Math.round(delay / 1000)}s`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
