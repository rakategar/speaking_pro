// Shared retry for Gemini calls. The free tier enforces a per-minute
// request quota, so a burst of concurrent analyses gets 429s; waiting the
// advertised retryDelay (or a growing default) inside the same request
// converts those into delayed successes instead of failures.

export type HttpError = Error & { status?: number };

const MAX_ATTEMPTS = 4;

function parseRetryDelayMs(message: string): number | null {
  const m = message.match(/retryDelay[^0-9]*([0-9]+(?:\.[0-9]+)?)s/);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

export async function withGeminiRetry<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = (error as HttpError).status;
      const retryable = status === 429 || (status !== undefined && status >= 500);
      if (!retryable || attempt === MAX_ATTEMPTS) throw error;
      const advertised = parseRetryDelayMs(String((error as Error).message));
      const delay =
        (advertised ?? 15_000 * attempt) + Math.random() * 5_000;
      console.warn(
        `[gemini] ${label} attempt ${attempt} got ${status}, retrying in ${Math.round(delay / 1000)}s`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
