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
      "Rekaman bebas 15 detik - 5 menit. AI akan mentranskrip lalu menilai struktur bahasa dan intonasi Anda secara menyeluruh.",
    steps: [
      "Pilih atmosfer panggung virtual yang sesuai.",
      "Sampaikan materi Anda seperti di depan audiens sungguhan.",
      "Terima rapor analisis lengkap dengan insight AI.",
    ],
  },

  // ── 18 Poin Daily Speaking Practice (client-side, tanpa AI) ────────────
  "articulation-exercise": {
    icon: "record_voice_over",
    route: "/drill/articulation-exercise",
    description:
      "Teleprompter kalimat berkonsonan rapat dengan slider kecepatan. Latih mulut mengucapkan setiap suku kata dengan tuntas.",
    steps: [
      "Ikuti sorotan kata dan ucapkan dengan artikulasi penuh.",
      "Mulai lambat, naikkan kecepatan bertahap.",
      "Ulangi kalimat yang tersendat sampai lancar.",
    ],
  },
  "pronunciation-practice": {
    icon: "hearing",
    route: "/drill/pronunciation-practice",
    description:
      "Rekam diri membaca istilah sulit lalu dengarkan sendiri. Rekaman tersimpan lokal di browser — tidak diunggah ke server.",
    steps: [
      "Baca teks target perlahan dan jelas.",
      "Putar ulang rekaman lokal Anda.",
      "Ulangi kata yang masih samar.",
    ],
  },
  "pause-technique": {
    icon: "motion_photos_paused",
    route: "/drill/pause-technique",
    description:
      "Sorotan kata berhenti di setiap tanda jeda. Latih berhenti bicara dengan sadar agar tempo melambat dan napas terkendali.",
    steps: [
      "Baca lantang mengikuti sorotan kata.",
      "Diam total saat sorotan berhenti di tanda jeda.",
      "Rasakan jeda membuat Anda terdengar tenang.",
    ],
  },
  "rhythm-training": {
    icon: "avg_pace",
    route: "/drill/rhythm-training",
    description:
      "Metronome visual 110-130 BPM. Ucapkan satu suku kata per kedipan cahaya untuk menstabilkan tempo bicara Anda.",
    steps: [
      "Rasakan ritme metronome beberapa detik.",
      "Baca naskah: satu suku kata per kedipan.",
      "Pertahankan tempo — jangan balapan.",
    ],
  },
  "confidence-drill": {
    icon: "bolt",
    route: "/drill/confidence-drill",
    description:
      "Hitung mundur 3-2-1 lalu proyeksikan afirmasi dengan suara lantang dan mantap. Bangun mental panggung setiap hari.",
    steps: [
      "Berdiri tegak, bahu terbuka.",
      "Setelah hitung mundur, ucapkan afirmasi volume penuh.",
      "Ulangi tiap afirmasi minimal dua kali.",
    ],
  },
  "self-recording-practice": {
    icon: "fact_check",
    route: "/drill/self-recording-practice",
    description:
      "Rekam perkenalan 60 detik, dengarkan ulang, lalu nilai diri lewat checklist mandiri. Semua tersimpan lokal di perangkat.",
    steps: [
      "Rekam tanpa mengulang saat tersendat.",
      "Dengarkan seperti Anda adalah audiensnya.",
      "Isi checklist evaluasi dengan jujur.",
    ],
  },
  "guided-speaking": {
    icon: "switch_access_shortcut",
    route: "/drill/guided-speaking",
    description:
      "Topik bicara berganti otomatis tiap 30 detik. Latih spontanitas: terus bicara tanpa berhenti dan tanpa takut salah.",
    steps: [
      "Mulai bicara begitu topik muncul.",
      "Pindah topik tanpa menutup kalimat lama.",
      "Hindari berhenti total — salah itu boleh.",
    ],
  },
  "vocal-variety": {
    icon: "music_note",
    route: "/drill/vocal-variety",
    description:
      "Baca cerita dengan nada mengikuti warna teks: navy nada rendah, cyan sedang, aqua tinggi. Obat ampuh suara monoton.",
    steps: [
      "Pahami legenda warna terlebih dulu.",
      "Baca dengan perpindahan nada yang dramatis.",
      "Ulangi sampai transisinya natural.",
    ],
  },
  "emphasis-training": {
    icon: "format_size",
    route: "/drill/emphasis-training",
    description:
      "Kata kunci tampil 2x lebih besar — biarkan mata menuntun suara memberi tekanan ekstra pada kata yang paling penting.",
    steps: [
      "Baca paragraf dengan tempo normal.",
      "Perlambat dan beri tenaga di kata besar.",
      "Rasakan pesan jadi lebih menempel.",
    ],
  },
  "energy-control": {
    icon: "tune",
    route: "/drill/energy-control",
    description:
      "Satu teks, tiga suasana: Profesional, Sangat Antusias, Empati Tinggi. Latih mengatur energi penyampaian sesuai konteks.",
    steps: [
      "Baca teks sekali per suasana.",
      "Ikuti instruksi energi di tiap tab.",
      "Bandingkan rasa ketiganya.",
    ],
  },
  "pause-mastery": {
    icon: "do_not_touch",
    route: "/drill/pause-mastery",
    description:
      "Anti-'eee': saat otak buntu, tekan & tahan tombol Blank Space. Layar gelap melatih Anda memilih diam daripada filler word.",
    steps: [
      "Bicarakan topik secara spontan.",
      "Filler mau keluar? Tekan dan tahan tombol.",
      "Lepas setelah kalimat berikutnya siap.",
    ],
  },
  "structured-thinking": {
    icon: "psychology",
    route: "/drill/structured-thinking",
    description:
      "30 detik menyusun kerangka dalam diam, 60 detik bicara terstruktur. Melatih berpikir dulu sebelum bicara.",
    steps: [
      "Susun Pembuka → 2 Poin → Penutup dalam diam.",
      "Sampaikan sesuai kerangka saat fase bicara.",
      "Jangan tambah poin baru di tengah jalan.",
    ],
  },
  "speaking-awareness": {
    icon: "counter_1",
    route: "/drill/speaking-awareness",
    description:
      "Rekam 60 detik lalu hitung sendiri filler word Anda dengan tombol +1 saat playback. Kesadaran adalah obat pertama.",
    steps: [
      "Rekam jawaban tanpa persiapan.",
      "Putar ulang, fokus hitung 'eee/hmm/anu'.",
      "Targetkan turun setiap hari.",
    ],
  },
  "story-structure": {
    icon: "auto_stories",
    route: "/drill/story-structure",
    description:
      "Bangun cerita 3 babak — Hook, Story, Lesson — kotak demi kotak dengan kalimat pembuka siap pakai dan timer per babak.",
    steps: [
      "Pilih satu pengalaman nyata.",
      "Selesaikan kotak berurutan dengan starter yang ada.",
      "Tiga kotak = satu cerita utuh yang runut.",
    ],
  },
  "framework-speaking": {
    icon: "view_agenda",
    route: "/drill/framework-speaking",
    description:
      "Formula P.R.E.P: Point, Reason, Example, Point. Kartu menyala bergantian memandu opini Anda tersusun dan meyakinkan.",
    steps: [
      "Pilih satu opini sederhana.",
      "Ikuti kartu yang menyala + kalimat pembukanya.",
      "Satu putaran = 2 menit opini terstruktur.",
    ],
  },
  "opening-closing": {
    icon: "compare_arrows",
    route: "/drill/opening-closing",
    description:
      "Bandingkan pembuka & penutup klise vs berdampak tinggi, lalu praktikkan versi baiknya lantang dan uji ingatan Anda.",
    steps: [
      "Kenali pola pembuka/penutup yang buruk.",
      "Ucapkan versi baik dengan lantang 2-3 kali.",
      "Sembunyikan teks, ulangi dengan kata sendiri.",
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
