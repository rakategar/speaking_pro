// Global sliding-window rate limiter for ALL Gemini calls.
// Free tier for gemini-3.1-flash-lite: 15 requests/min and 250k tokens/min.
// We budget below that (12 req, 200k tokens) so bursts, retries and token
// under-estimates can never trip the real quota. All Gemini traffic flows
// through the single analysis worker, so an in-process limiter is exact.

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const MAX_TOKENS = 200_000;

type Slot = { at: number; tokens: number };

class GeminiLimiter {
  private history: Slot[] = [];

  private prune(now: number) {
    this.history = this.history.filter((s) => now - s.at < WINDOW_MS);
  }

  /** Resolves when a request with estTokens fits the per-minute budget. */
  async acquire(label: string, estTokens: number): Promise<void> {
    // A single oversized request may exceed MAX_TOKENS on its own; cap it
    // so it can still run (alone in its window).
    const tokens = Math.min(estTokens, MAX_TOKENS);
    for (;;) {
      const now = Date.now();
      this.prune(now);
      const used = this.history.reduce((s, h) => s + h.tokens, 0);
      if (
        this.history.length < MAX_REQUESTS &&
        (this.history.length === 0 || used + tokens <= MAX_TOKENS)
      ) {
        this.history.push({ at: now, tokens });
        console.log(
          `[limiter] ${label}: granted (${this.history.length}/${MAX_REQUESTS} req, ${used + tokens}/${MAX_TOKENS} tok in window)`,
        );
        return;
      }
      const oldest = this.history[0];
      const waitMs = Math.max(500, oldest.at + WINDOW_MS - now + 250);
      console.log(
        `[limiter] ${label}: window full (${this.history.length} req, ${used} tok), wait ${Math.round(waitMs / 1000)}s`,
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

// Survive module re-evaluation (route bundles vs worker bundle) so there is
// exactly one budget per Node process.
const globalStore = globalThis as unknown as { __geminiLimiter?: GeminiLimiter };
export const geminiLimiter =
  globalStore.__geminiLimiter ?? (globalStore.__geminiLimiter = new GeminiLimiter());

/** Gemini counts ~25 tokens per second of audio. */
export function estimateAudioTokens(bytes: number): number {
  // Browser/opus recordings are ~4 kB per second (32 kbps).
  const seconds = Math.max(10, bytes / 4000);
  return Math.ceil(seconds * 25) + 1500; // + prompt & transcript output slack
}

/** Rough text token estimate (~4 chars/token) plus prompt + JSON output. */
export function estimateTextTokens(chars: number): number {
  return Math.ceil(chars / 4) + 1200;
}
