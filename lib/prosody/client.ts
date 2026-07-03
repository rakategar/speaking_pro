export type ProsodyFeatures = {
  pitch_mean: number;
  pitch_variance: number;
  pause_ratio: number;
  wpm: number;
  energy_variance: number;
};

export type ProsodyResult = {
  intonation_score: number;
  features: ProsodyFeatures;
};

/**
 * Convert raw prosody features into a 0-100 intonation score.
 * Heuristic: reward pitch variation (monotone = flat, low score),
 * a healthy pause ratio (~10-25%), a 110-150 WPM speaking rate,
 * and dynamic energy. Weights are a first pass -- refine with real data.
 */
export function scoreFromFeatures(f: ProsodyFeatures): number {
  // Pitch variation: coefficient of variation, sweet spot ~0.15-0.35.
  const pitchCv =
    f.pitch_mean > 0 ? Math.sqrt(f.pitch_variance) / f.pitch_mean : 0;
  const pitchScore =
    pitchCv <= 0
      ? 20
      : 100 - Math.min(100, Math.abs(pitchCv - 0.25) * 300);

  // Pauses: ideal 10-25% of total duration.
  const pauseScore =
    f.pause_ratio < 0.05
      ? 55 // breathless, no pauses
      : f.pause_ratio > 0.4
        ? 40 // too hesitant
        : 100 - Math.abs(f.pause_ratio - 0.17) * 200;

  // Rate: ideal 110-150 WPM for Indonesian public speaking.
  const rateScore = 100 - Math.min(100, Math.abs(f.wpm - 130) * 1.2);

  // Energy dynamics: normalized variance, more is livelier (cap at 1).
  const energyScore = Math.min(1, f.energy_variance) * 100;

  const combined =
    0.35 * pitchScore + 0.2 * pauseScore + 0.25 * rateScore + 0.2 * energyScore;
  return Math.round(Math.max(0, Math.min(100, combined)));
}

/**
 * Send audio to the Python prosody microservice (services/prosody).
 * Requires PROSODY_SERVICE_URL and a reachable service -- no fixture mode.
 */
export async function analyzeProsody(audio: Blob): Promise<ProsodyResult> {
  const url = process.env.PROSODY_SERVICE_URL;
  if (!url) {
    throw new Error(
      "PROSODY_SERVICE_URL belum dikonfigurasi di server. Analisis intonasi tidak dapat dijalankan.",
    );
  }

  const form = new FormData();
  form.append("file", audio, "recording.webm");

  let res: Response;
  try {
    res = await fetch(`${url.replace(/\/$/, "")}/analyze`, {
      method: "POST",
      headers: process.env.PROSODY_SERVICE_SECRET
        ? { Authorization: `Bearer ${process.env.PROSODY_SERVICE_SECRET}` }
        : undefined,
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (error) {
    throw new Error(
      `Layanan analisis intonasi tidak dapat dihubungi: ${String(error)}`,
    );
  }
  if (!res.ok) {
    throw new Error(`prosody service ${res.status}: ${await res.text()}`);
  }
  const features = (await res.json()) as ProsodyFeatures;
  return {
    intonation_score: scoreFromFeatures(features),
    features,
  };
}
