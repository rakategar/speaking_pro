import http from "node:http";

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

// The prosody service sends no response headers until librosa finishes,
// and with the single-core serial queue that can take minutes. Both Node's
// built-in fetch and the undici package abort such responses after ~300s
// (headersTimeout) no matter what AbortSignal says, so speak plain
// node:http where the only deadline is our own timeout below.
const PROSODY_TIMEOUT_MS = 540_000; // must stay below nginx proxy_read_timeout (600s)

function postMultipart(
  target: string,
  file: Buffer,
): Promise<{ status: number; body: string }> {
  const boundary = `----prosody${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="recording.webm"\r\n` +
      `Content-Type: audio/webm\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const payload = Buffer.concat([head, file, tail]);

  return new Promise((resolve, reject) => {
    const req = http.request(
      target,
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": payload.length,
          ...(process.env.PROSODY_SERVICE_SECRET
            ? { Authorization: `Bearer ${process.env.PROSODY_SERVICE_SECRET}` }
            : {}),
        },
        timeout: PROSODY_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        res.on("error", reject);
      },
    );
    // "timeout" fires on socket inactivity; the service stays silent while
    // the request waits in its queue, so treat it as a hard deadline.
    req.on("timeout", () => {
      req.destroy(new Error(`timeout ${PROSODY_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.end(payload);
  });
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

  let res: { status: number; body: string };
  try {
    res = await postMultipart(
      `${url.replace(/\/$/, "")}/analyze`,
      Buffer.from(await audio.arrayBuffer()),
    );
  } catch (error) {
    throw new Error(
      `Layanan analisis intonasi tidak dapat dihubungi: ${String(error)}`,
    );
  }
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`prosody service ${res.status}: ${res.body.slice(0, 300)}`);
  }
  const features = JSON.parse(res.body) as ProsodyFeatures;
  return {
    intonation_score: scoreFromFeatures(features),
    features,
  };
}
