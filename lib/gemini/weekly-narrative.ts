// The coaching narrative for the weekly summary PDF.
//
// Same provider, limiter and retry plumbing as lib/gemini/scoring-llm.ts --
// the difference is scope: scoring-llm judges ONE transcript, this reads a
// whole week of already-computed reports and writes the prose around them.
// It never invents numbers; the PDF renders the real figures itself and the
// model is told to interpret them, not restate them.
//
// Server-only: GEMINI_API_KEY must never reach the client bundle.

import { withGeminiRetry, type HttpError } from "./retry";
import { geminiLimiter, estimateTextTokens } from "./limiter";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type WeeklyNarrative = {
  executive_summary: string[];
  highlight_of_week: string;
  strengths: { title: string; detail: string }[];
  improvements: { title: string; detail: string; drill_suggestion: string }[];
  trend_reading: string;
  next_week_goals: { goal: string; why: string; how: string }[];
  coach_note: string;
};

const SYSTEM_PROMPT = `Anda adalah pelatih public speaking profesional berbahasa Indonesia untuk aplikasi Speaking Pro. Anda sedang menulis laporan mingguan personal untuk satu peserta didik.

Aturan penulisan:
- Bahasa Indonesia yang hangat, profesional, dan suportif. Sapa peserta dengan "Anda".
- JANGAN mengarang angka, tanggal, atau kejadian yang tidak ada di data. Semua angka sudah dicetak di laporan; tugas Anda MENAFSIRKAN angka itu, bukan mengulanginya satu per satu.
- Kaitkan penilaian dengan tujuan dan profesi peserta bila tersedia.
- Spesifik dan bisa dikerjakan. Hindari pujian kosong dan klise motivasi.
- Bila datanya sedikit (hanya 1-2 sesi), katakan terus terang bahwa datanya belum banyak dan jangan menarik kesimpulan berlebihan.

Format keluaran (JSON valid, TANPA teks lain):
{
  "executive_summary": [string, ...],           // 3-5 paragraf, tiap paragraf 2-4 kalimat
  "highlight_of_week": string,                  // 1 kalimat, momen terbaik minggu ini
  "strengths": [{"title": string, "detail": string}],                        // 3-4 item
  "improvements": [{"title": string, "detail": string, "drill_suggestion": string}],  // 3-4 item
  "trend_reading": string,                      // 2-4 kalimat membaca arah tren skor
  "next_week_goals": [{"goal": string, "why": string, "how": string}],       // tepat 3 item
  "coach_note": string                          // 2-3 kalimat penutup personal
}`;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

function parseNarrative(raw: string): WeeklyNarrative {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Respons LLM tidak berisi JSON");
  const p = JSON.parse(match[0]);

  const paragraphs = Array.isArray(p.executive_summary)
    ? p.executive_summary.map((x: unknown) => str(x)).filter(Boolean).slice(0, 6)
    : [str(p.executive_summary)].filter(Boolean);

  return {
    executive_summary: paragraphs,
    highlight_of_week: str(p.highlight_of_week),
    strengths: (Array.isArray(p.strengths) ? p.strengths : [])
      .map((s: { title?: string; detail?: string }) => ({
        title: str(s?.title),
        detail: str(s?.detail),
      }))
      .filter((s: { title: string }) => s.title)
      .slice(0, 4),
    improvements: (Array.isArray(p.improvements) ? p.improvements : [])
      .map((s: { title?: string; detail?: string; drill_suggestion?: string }) => ({
        title: str(s?.title),
        detail: str(s?.detail),
        drill_suggestion: str(s?.drill_suggestion),
      }))
      .filter((s: { title: string }) => s.title)
      .slice(0, 4),
    trend_reading: str(p.trend_reading),
    next_week_goals: (Array.isArray(p.next_week_goals) ? p.next_week_goals : [])
      .map((g: { goal?: string; why?: string; how?: string }) => ({
        goal: str(g?.goal),
        why: str(g?.why),
        how: str(g?.how),
      }))
      .filter((g: { goal: string }) => g.goal)
      .slice(0, 3),
    coach_note: str(p.coach_note),
  };
}

/**
 * Writes the narrative for one user's week. `facts` is a compact,
 * already-aggregated view of the week -- keep it small, it goes in the prompt.
 *
 * Throws on failure; the caller is expected to fall back to deterministic
 * copy rather than lose the whole PDF, the same way the receipt attachment in
 * lib/subscription/activate.ts is best-effort.
 */
export async function writeWeeklyNarrative(
  facts: Record<string, unknown>,
): Promise<WeeklyNarrative> {
  const payload = JSON.stringify(facts, null, 1);

  const res = await withGeminiRetry("weekly-narrative", async (key) => {
    await geminiLimiter.acquire("weekly-narrative", estimateTextTokens(payload.length));
    const r = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Berikut data latihan peserta selama satu minggu:\n\n${payload}\n\nTulis laporan mingguannya sekarang.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!r.ok) {
      const err: HttpError = new Error(
        `Narasi mingguan gagal: Gemini ${r.status}: ${(await r.text()).slice(0, 400)}`,
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
      `Narasi mingguan gagal: respons Gemini kosong (finishReason: ${data?.candidates?.[0]?.finishReason ?? "?"})`,
    );
  }
  return parseNarrative(raw);
}
