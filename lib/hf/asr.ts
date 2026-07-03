import { getHfClient, hasHfToken } from "./client";

const PRIMARY_MODEL = "openai/whisper-large-v3";
const FALLBACK_MODEL = "openai/whisper-large-v3-turbo";
// Indonesian fine-tune, config-flagged secondary path for A/B testing.
const ID_MODEL = process.env.HF_ASR_MODEL_ID;

export type AsrResult = {
  text: string;
  model: string;
};

async function runModel(audio: Blob, model: string): Promise<string> {
  const result = await getHfClient().automaticSpeechRecognition({
    model,
    data: audio,
  });
  return result.text?.trim() ?? "";
}

/**
 * Transcribe an Indonesian speech recording, falling back through models.
 * Requires HF_TOKEN -- there is no demo/fixture mode.
 */
export async function transcribe(audio: Blob): Promise<AsrResult> {
  if (!hasHfToken) {
    throw new Error(
      "HF_TOKEN belum dikonfigurasi di server. Transkripsi tidak dapat dijalankan.",
    );
  }

  const models = [ID_MODEL, PRIMARY_MODEL, FALLBACK_MODEL].filter(
    (m): m is string => Boolean(m),
  );

  let lastError: unknown;
  for (const model of models) {
    try {
      const text = await runModel(audio, model);
      if (text) return { text, model };
    } catch (error) {
      lastError = error;
      console.error(`[asr] ${model} failed:`, error);
    }
  }
  throw new Error(
    `Transkripsi gagal di semua model ASR: ${String(lastError)}`,
  );
}
