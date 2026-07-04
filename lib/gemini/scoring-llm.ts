// Gemini replacement for lib/hf/scoring-llm.ts -- same contract
// (scoreStructure -> StructureScoring), different provider.
// Server-only: GEMINI_API_KEY must never reach the client bundle.

import type { Insight, StructureScoring } from "@/lib/hf/scoring-llm";
import { withGeminiRetry, type HttpError } from "./retry";
import { geminiLimiter, estimateTextTokens } from "./limiter";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

const SYSTEM_PROMPT = `Anda adalah pelatih public speaking profesional berbahasa Indonesia untuk aplikasi Speaking Pro.
Nilai transkrip latihan berbicara berikut dengan rubrik:
- structure_score (0-100): kejelasan struktur pembuka-isi-penutup, koherensi antar kalimat, tata bahasa Indonesia yang benar, kejelasan pesan utama.
- clarity_score (0-100): kejelasan penyampaian ide, pilihan kata, kalimat yang tidak berbelit.
- confidence_score (0-100): indikasi kepercayaan diri dari pilihan bahasa (kalimat tegas vs ragu-ragu, repetisi gugup, kualifikasi berlebihan seperti "mungkin", "sepertinya").
- filler_word_count: jumlah kata pengisi (eee, emm, anu, apa namanya, kayak, gitu, ya kan, dan pengulangan gugup).
- summary: 1-2 kalimat ringkasan bernada suportif seperti pelatih.
- insights: 2-4 item {type: "strength"|"improvement", text}. Text spesifik, actionable, bahasa Indonesia, merujuk isi transkrip.

Balas HANYA dengan JSON valid berformat:
{"structure_score": number, "clarity_score": number, "confidence_score": number, "filler_word_count": number, "summary": string, "insights": [{"type": "strength"|"improvement", "text": string}]}`;

function clamp(n: unknown, lo = 0, hi = 100): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : lo;
  return Math.round(Math.max(lo, Math.min(hi, v)));
}

function parseScoring(raw: string): StructureScoring {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Respons LLM tidak berisi JSON");
  const parsed = JSON.parse(match[0]);

  const insights: Insight[] = Array.isArray(parsed.insights)
    ? parsed.insights
        .filter(
          (i: { type?: string; text?: string }) =>
            (i?.type === "strength" || i?.type === "improvement") &&
            typeof i?.text === "string",
        )
        .slice(0, 4)
    : [];

  return {
    structure_score: clamp(parsed.structure_score),
    clarity_score: clamp(parsed.clarity_score),
    confidence_score: clamp(parsed.confidence_score),
    filler_word_count: clamp(parsed.filler_word_count, 0, 999),
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    insights,
  };
}

/**
 * Score language structure of an Indonesian transcript via Gemini.
 * Same behaviour contract as the HF version it replaces.
 */
export async function scoreStructure(
  transcript: string,
  durationSeconds: number | null,
): Promise<StructureScoring> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi di server. Penilaian struktur tidak dapat dijalankan.",
    );
  }

  const res = await withGeminiRetry("scoring", async () => {
    await geminiLimiter.acquire("scoring", estimateTextTokens(transcript.length));
    const r = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Durasi rekaman: ${durationSeconds ? `${Math.round(durationSeconds)} detik` : "tidak diketahui"}.\n\nTranskrip:\n"""${transcript}"""`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) {
      const err: HttpError = new Error(
        `Penilaian struktur gagal: Gemini ${r.status}: ${(await r.text()).slice(0, 400)}`,
      );
      err.status = r.status;
      throw err;
    }
    return r;
  });

  const data = await res.json();
  const raw: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("") ?? "";
  if (!raw) {
    throw new Error(
      `Penilaian struktur gagal: respons Gemini kosong (finishReason: ${data?.candidates?.[0]?.finishReason ?? "?"})`,
    );
  }
  return parseScoring(raw);
}
