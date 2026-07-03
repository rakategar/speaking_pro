/**
 * Static per-module presentation metadata keyed by practice_modules.slug.
 * Dynamic facts (title, category, difficulty, duration) live in the DB;
 * this holds what the DB doesn't: icons, blurbs, and practice routes.
 */
export const MODULE_META: Record<
  string,
  { icon: string; route: string; description: string; steps: string[] }
> = {
  "aiueo-drill": {
    icon: "mic",
    route: "/record/aiueo",
    description:
      "Latihan artikulasi vokal dasar. Ucapkan A-I-U-E-O dengan mulut terbuka lebar untuk melatih kejelasan pengucapan setiap suku kata.",
    steps: [
      "Ucapkan huruf vokal yang tampil dengan artikulasi penuh.",
      "Perhatikan visualizer -- suara yang jelas menghasilkan bar yang tinggi.",
      "Selesaikan kelima vokal untuk menuntaskan drill.",
    ],
  },
  "dynamic-pitch": {
    icon: "graphic_eq",
    route: "/record/pitch",
    description:
      "Latihan intonasi dinamis. Ikuti garis target dan variasikan nada suara Anda agar tidak monoton saat menekankan kata kunci.",
    steps: [
      "Baca naskah latihan dengan menaikkan nada di kata yang disorot.",
      "Pantau grafik pitch real-time -- cocokkan dengan garis target.",
      "Turunkan nada di akhir kalimat agar terdengar lebih berwibawa.",
    ],
  },
  "breathing-control": {
    icon: "air",
    route: "/record/breathing",
    description:
      "Teknik pernapasan 4-4-8 untuk menenangkan gugup dan menopang suara. Tarik napas 4 detik, tahan 4 detik, hembuskan 8 detik.",
    steps: [
      "Ikuti lingkaran yang mengembang: tarik napas saat membesar.",
      "Tahan saat lingkaran diam, hembuskan perlahan saat mengecil.",
      "Selesaikan minimal 4 siklus sebelum sesi bicara penting.",
    ],
  },
  "free-recording": {
    icon: "podium",
    route: "/record",
    description:
      "Rekaman bebas maksimal 5 menit. AI akan mentranskrip lalu menilai struktur bahasa dan intonasi Anda secara menyeluruh.",
    steps: [
      "Pilih atmosfer panggung virtual yang sesuai.",
      "Sampaikan materi Anda seperti di depan audiens sungguhan.",
      "Terima rapor analisis lengkap dengan insight AI.",
    ],
  },
};

export function difficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return "text-brand-cyan";
    case "medium":
      return "text-orange-500";
    default:
      return "text-red-500";
  }
}
