// The narrative layer of the B2B dashboard.
//
// Same provider, limiter and retry plumbing as lib/gemini/weekly-narrative.ts
// -- the difference is audience and scope. weekly-narrative writes TO one
// participant about their own week; this writes TO the training organizer
// about a whole cohort, and its job is to tell them what to do next.
//
// PRIVACY: `facts` must contain aggregates and names only. No transcripts, no
// audio, no per-session content ever reaches this call. See the note at the
// top of lib/client/analytics.ts.
//
// Server-only: GEMINI_API_KEY must never reach the client bundle.

import { withGeminiRetry, type HttpError } from "./retry";
import { geminiLimiter, estimateTextTokens } from "./limiter";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type CohortNarrative = {
  executive_summary: string[];
  cohort_strengths: { title: string; detail: string }[];
  cohort_risks: { title: string; detail: string; affected: string }[];
  trend_reading: string;
  forecast_reading: string;
  trainer_actions: { action: string; why: string; who: string }[];
  closing_note: string;
};

const SYSTEM_PROMPT = `Anda adalah konsultan pelatihan public speaking berbahasa Indonesia untuk aplikasi Speaking Pro. Anda menulis laporan untuk PENYELENGGARA training di sebuah organisasi (HR, PIC program, atau trainer) mengenai perkembangan sekelompok peserta.

Aturan penulisan:
- Bahasa Indonesia profesional dan ringkas. Sapa pembaca sebagai penyelenggara, bukan sebagai peserta.
- JANGAN mengarang angka, tanggal, atau kejadian yang tidak ada di data. Semua angka sudah dicetak di dashboard dan PDF; tugas Anda MENAFSIRKAN angka itu, bukan mengulanginya satu per satu.
- Peserta yang tertinggal disebut secara membangun: fokus pada langkah yang bisa diambil penyelenggara, bukan penilaian pribadi. Jangan pernah menuliskan kalimat yang memalukan bila dibaca peserta itu sendiri.
- Spesifik dan bisa dikerjakan. Hindari klise motivasi dan pujian kosong.
- Bila datanya sedikit (peserta sedikit atau sesi sedikit), katakan terus terang bahwa kesimpulannya belum kuat.
- Bila data forecast menyebut keyakinan "lemah", JANGAN menyajikan proyeksi itu sebagai kepastian.

Format keluaran (JSON valid, TANPA teks lain):
{
  "executive_summary": [string, ...],        // 3-5 paragraf, tiap paragraf 2-4 kalimat
  "cohort_strengths": [{"title": string, "detail": string}],                   // 2-4 item
  "cohort_risks": [{"title": string, "detail": string, "affected": string}],   // 2-4 item; "affected" = siapa/berapa peserta
  "trend_reading": string,                   // 2-4 kalimat membaca arah tren
  "forecast_reading": string,                // 2-4 kalimat menafsirkan proyeksi, sebutkan tingkat keyakinannya
  "trainer_actions": [{"action": string, "why": string, "who": string}],       // tepat 3 item
  "closing_note": string                     // 2-3 kalimat penutup
}`;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

function parseNarrative(raw: string): CohortNarrative {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Respons LLM tidak berisi JSON");
  const p = JSON.parse(match[0]);

  const paragraphs = Array.isArray(p.executive_summary)
    ? p.executive_summary.map((x: unknown) => str(x)).filter(Boolean).slice(0, 6)
    : [str(p.executive_summary)].filter(Boolean);

  return {
    executive_summary: paragraphs,
    cohort_strengths: (Array.isArray(p.cohort_strengths) ? p.cohort_strengths : [])
      .map((s: { title?: string; detail?: string }) => ({
        title: str(s?.title),
        detail: str(s?.detail),
      }))
      .filter((s: { title: string }) => s.title)
      .slice(0, 4),
    cohort_risks: (Array.isArray(p.cohort_risks) ? p.cohort_risks : [])
      .map((s: { title?: string; detail?: string; affected?: string }) => ({
        title: str(s?.title),
        detail: str(s?.detail),
        affected: str(s?.affected),
      }))
      .filter((s: { title: string }) => s.title)
      .slice(0, 4),
    trend_reading: str(p.trend_reading),
    forecast_reading: str(p.forecast_reading),
    trainer_actions: (Array.isArray(p.trainer_actions) ? p.trainer_actions : [])
      .map((g: { action?: string; why?: string; who?: string }) => ({
        action: str(g?.action),
        why: str(g?.why),
        who: str(g?.who),
      }))
      .filter((g: { action: string }) => g.action)
      .slice(0, 3),
    closing_note: str(p.closing_note),
  };
}

/**
 * Writes the cohort narrative. `facts` is a compact, already-aggregated view
 * of the period -- keep it small, it goes straight into the prompt.
 *
 * Throws on failure; the caller shows the numbers without prose rather than
 * losing the whole page, matching the best-effort posture of the receipt
 * attachment in lib/subscription/activate.ts.
 */
export async function writeCohortNarrative(
  facts: Record<string, unknown>,
): Promise<CohortNarrative> {
  const payload = JSON.stringify(facts, null, 1);

  const res = await withGeminiRetry("cohort-narrative", async (key) => {
    await geminiLimiter.acquire("cohort-narrative", estimateTextTokens(payload.length));
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
                text: `Berikut rekap latihan satu kelompok peserta:\n\n${payload}\n\nTulis laporannya sekarang.`,
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
        `Narasi kohort gagal: Gemini ${r.status}: ${(await r.text()).slice(0, 400)}`,
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
      `Narasi kohort gagal: respons Gemini kosong (finishReason: ${data?.candidates?.[0]?.finishReason ?? "?"})`,
    );
  }
  return parseNarrative(raw);
}
