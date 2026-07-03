import { getHfClient, hasHfToken } from "./client";

const PRIMARY_MODEL = "Qwen/Qwen2.5-72B-Instruct";
const FALLBACK_MODEL = "meta-llama/Llama-3.1-8B-Instruct";

export type Insight = {
  type: "strength" | "improvement";
  text: string;
};

export type StructureScoring = {
  structure_score: number;
  clarity_score: number;
  confidence_score: number;
  filler_word_count: number;
  summary: string;
  insights: Insight[];
};

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
  // Strip code fences / stray prose around the JSON object.
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

async function runModel(
  model: string,
  transcript: string,
  durationSeconds: number | null,
): Promise<StructureScoring> {
  const completion = await getHfClient().chatCompletion({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Durasi rekaman: ${durationSeconds ? `${Math.round(durationSeconds)} detik` : "tidak diketahui"}.\n\nTranskrip:\n"""${transcript}"""`,
      },
    ],
    temperature: 0.3,
    max_tokens: 800,
  });
  const raw = completion.choices?.[0]?.message?.content ?? "";
  return parseScoring(raw);
}

/**
 * Score language structure of an Indonesian transcript via an
 * instruction-tuned LLM. Requires HF_TOKEN -- no demo/fixture mode.
 */
export async function scoreStructure(
  transcript: string,
  durationSeconds: number | null,
): Promise<StructureScoring> {
  if (!hasHfToken) {
    throw new Error(
      "HF_TOKEN belum dikonfigurasi di server. Penilaian struktur tidak dapat dijalankan.",
    );
  }

  let lastError: unknown;
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    try {
      return await runModel(model, transcript, durationSeconds);
    } catch (error) {
      lastError = error;
      console.error(`[scoring-llm] ${model} failed:`, error);
    }
  }
  throw new Error(`Penilaian struktur gagal: ${String(lastError)}`);
}
