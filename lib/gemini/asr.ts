// Gemini replacement for lib/hf/asr.ts -- same contract (transcribe ->
// AsrResult), audio goes straight to Gemini as inlineData (no Whisper).
// HF whisper is kept only as a last-resort fallback when Gemini errors.
// Server-only: GEMINI_API_KEY must never reach the client bundle.

import type { AsrResult } from "@/lib/hf/asr";
import { transcribe as hfTranscribe } from "@/lib/hf/asr";
import { withGeminiRetry } from "./retry";
import { geminiLimiter, estimateAudioTokens } from "./limiter";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const PROMPT =
  "Transkripsikan rekaman suara berbahasa Indonesia ini kata per kata, " +
  "termasuk kata pengisi (eee, emm, anu). Jangan menambahkan komentar, " +
  "terjemahan, atau tanda waktu. Balas HANYA dengan teks transkrip.";

// ~35 minutes of real speech; also caps runaway repetition loops the model
// can fall into on highly repetitive audio. A MAX_TOKENS finish still
// returns usable text, so it is accepted below.
const MAX_OUTPUT_TOKENS = 8192;

async function geminiOnce(audio: Blob, key: string): Promise<string> {
  await geminiLimiter.acquire("asr", estimateAudioTokens(audio.size));
  const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
  const res = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType: audio.type || "audio/webm", data } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }),
    signal: AbortSignal.timeout(240_000),
  });

  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    const err = new Error(`Gemini ASR ${res.status}: ${body}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  const json = await res.json();
  const text: string =
    json?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim() ?? "";
  if (!text) {
    throw new Error(
      `Gemini ASR respons kosong (finishReason: ${json?.candidates?.[0]?.finishReason ?? "?"})`,
    );
  }
  return text;
}

/**
 * Transcribe an Indonesian speech recording via Gemini (audio -> text).
 * Retries on 429/5xx with backoff, then falls back to HF whisper.
 */
export async function transcribe(audio: Blob): Promise<AsrResult> {
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    try {
      const text = await withGeminiRetry("asr", () => geminiOnce(audio, key));
      return { text, model: MODEL };
    } catch (error) {
      console.error("[asr] gemini failed, falling back to HF whisper:", error);
    }
  } else {
    console.error("[asr] GEMINI_API_KEY missing, using HF whisper directly");
  }
  return hfTranscribe(audio);
}
