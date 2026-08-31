// The coaching voice of the "Mentor AI" page (/library).
//
// Same provider, limiter and retry plumbing as lib/gemini/cohort-narrative.ts.
// The difference is what the model is allowed to decide: NOTHING about which
// modules are recommended. lib/mentor/plan.ts has already chosen them from the
// user's own report numbers; this call writes the reasoning around that
// choice. A model that picked modules could contradict the scores printed
// right next to it, and the user would be right to stop trusting both.
//
// PRIVACY: only the latest report's numbers and the chosen slugs are sent. The
// transcript -- what the user actually said -- never leaves the database for
// this feature.
//
// Server-only: GEMINI_API_KEY must never reach the client bundle.

import { withGeminiRetry, type HttpError } from "./retry";
import { geminiLimiter, estimateTextTokens } from "./limiter";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const BASE = "https://generativelanguage.googleapis.com/v1beta";

export type MentorNote = {
  /** 2-3 sentences: what the mentor reads in the numbers. */
  diagnosis: string;
  /** One entry per chosen module, keyed by slug. */
  picks: { slug: string; why: string; focus: string }[];
  /** One measurable target for the week. */
  weekly_target: string;
};

const SYSTEM_PROMPT = `Anda adalah mentor public speaking pribadi berbahasa Indonesia di aplikasi Speaking Pro. Anda berbicara langsung kepada satu peserta tentang hasil latihannya.

Aturan penulisan:
- Bahasa Indonesia yang hangat, tegas, dan personal. Sapa peserta dengan "Anda".
- JANGAN mengarang angka. Angka yang boleh Anda sebut hanya yang ada di data. Skor sudah ditampilkan di layar; tugas Anda MENAFSIRKAN, bukan mengulang daftar angka.
- MODUL SUDAH DIPILIH. Anda TIDAK boleh mengganti, menambah, atau mengurangi modul. Tulis alasan untuk setiap slug yang diberikan, persis slug itu, tanpa kecuali.
- Setiap alasan harus mengaitkan modul dengan kelemahan yang terlihat di angka, lalu menyebut apa yang berubah kalau dilatih.
- Spesifik dan bisa dikerjakan hari ini. Hindari klise motivasi ("semangat!", "kamu pasti bisa") dan pujian kosong.
- Bila datanya hanya satu sesi, katakan terus terang bahwa gambarannya belum lengkap dan jangan menarik kesimpulan berlebihan.
- Bila belum ada data latihan sama sekali, tulis sebagai perkenalan: jelaskan apa yang akan diukur, jangan menilai apa pun.

Format keluaran (JSON valid, TANPA teks lain):
{
  "diagnosis": string,                                        // 2-3 kalimat
  "picks": [{"slug": string, "why": string, "focus": string}], // satu per slug yang diberikan, urutan sama
  "weekly_target": string                                     // 1 kalimat, target terukur minggu ini
}
Keterangan: "why" = 1-2 kalimat alasan modul ini untuk Anda; "focus" = satu hal konkret yang harus diperhatikan saat mengerjakannya (maksimal 12 kata).`;

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;

/**
 * Parses the response and *re-imposes* the caller's slug list on it: any slug
 * the model invented is dropped, and the order is the planner's order, not the
 * model's. This is the enforcement half of "the model explains, it does not
 * choose".
 */
function parseNote(raw: string, allowedSlugs: string[]): MentorNote {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Respons LLM tidak berisi JSON");
  const p = JSON.parse(match[0]);

  const returned = new Map<string, { why: string; focus: string }>();
  if (Array.isArray(p.picks)) {
    for (const item of p.picks as { slug?: string; why?: string; focus?: string }[]) {
      const slug = str(item?.slug);
      if (slug && allowedSlugs.includes(slug) && !returned.has(slug)) {
        returned.set(slug, { why: str(item?.why), focus: str(item?.focus) });
      }
    }
  }

  return {
    diagnosis: str(p.diagnosis),
    picks: allowedSlugs.map((slug) => ({
      slug,
      why: returned.get(slug)?.why ?? "",
      focus: returned.get(slug)?.focus ?? "",
    })),
    weekly_target: str(p.weekly_target),
  };
}

/**
 * Writes the mentor note for one user's current plan.
 *
 * Throws on failure; the caller falls back to template copy (see
 * fallbackReason in lib/mentor/plan.ts) so a model outage never empties the
 * page.
 */
export async function writeMentorNote(
  facts: Record<string, unknown>,
  slugs: string[],
): Promise<MentorNote> {
  const payload = JSON.stringify(facts, null, 1);

  const res = await withGeminiRetry("mentor-note", async (key) => {
    await geminiLimiter.acquire("mentor-note", estimateTextTokens(payload.length));
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
                text: `Berikut hasil latihan peserta dan modul yang sudah dipilih untuknya:\n\n${payload}\n\nTulis catatan mentornya sekarang.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) {
      const err: HttpError = new Error(
        `Catatan mentor gagal: Gemini ${r.status}: ${(await r.text()).slice(0, 400)}`,
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
      `Catatan mentor gagal: respons Gemini kosong (finishReason: ${data?.candidates?.[0]?.finishReason ?? "?"})`,
    );
  }
  return parseNote(raw, slugs);
}
