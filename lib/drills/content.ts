/**
 * Client-side daily drill definitions ("18 Poin Daily Speaking Practice").
 * All scripts are hardcoded so drills run with zero API/AI calls — the only
 * server touch is logging completion via /api/drills/complete.
 *
 * Engine kinds map to components in components/drill/.
 */

export type WizardStep = {
  label: string;
  text: string;
  seconds: number;
  /** Hide the text during this step (e.g. silent preparation). */
  hidden?: boolean;
};

export type ToneSegment = { text: string; tone: "low" | "mid" | "high" };
export type EmphasisSegment = { text: string; big?: boolean };

export type DrillEngine =
  | {
      kind: "word-highlight";
      sentences: string[];
      minWpm: number;
      maxWpm: number;
      defaultWpm: number;
      /** Pause this long when the token "//" is reached. */
      pauseMs?: number;
    }
  | {
      kind: "local-record";
      prompt: string;
      scriptText?: string;
      checklist?: string[];
      fillerCounter?: boolean;
      maxSeconds: number;
    }
  | { kind: "metronome"; minBpm: number; maxBpm: number; defaultBpm: number; script: string }
  | { kind: "countdown-affirmation"; affirmations: string[] }
  | { kind: "wizard"; steps: WizardStep[]; loop?: boolean }
  | { kind: "tone-text"; segments: ToneSegment[] }
  | { kind: "emphasis-text"; segments: EmphasisSegment[] }
  | {
      kind: "energy-tabs";
      script: string;
      moods: { label: string; instruction: string; cardClass: string }[];
    }
  | { kind: "blank-space"; script: string }
  | {
      kind: "structure-boxes";
      boxes: { title: string; hint: string; starters: string[]; seconds: number }[];
    }
  | {
      kind: "comparison";
      pairs: { title: string; bad: string; good: string; note: string }[];
    };

export type DrillConfig = {
  slug: string;
  title: string;
  tagline: string;
  /** Recommended practice time; feeds the daily 10-minute goal. */
  goalSeconds: number;
  instructions: string[];
  engine: DrillEngine;
};

export const DRILLS: Record<string, DrillConfig> = {
  // ── A. Artikulasi ────────────────────────────────────────────────────────
  "articulation-exercise": {
    slug: "articulation-exercise",
    title: "Artikulasi Konsonan",
    tagline:
      "Teleprompter kalimat berkonsonan rapat. Ikuti sorotan kata dan ucapkan setiap suku kata dengan tuntas.",
    goalSeconds: 5 * 60,
    instructions: [
      "Ucapkan kata yang tersorot dengan artikulasi penuh — jangan menelan suku kata.",
      "Atur kecepatan dengan slider; mulai lambat, naikkan bertahap.",
      "Ulangi kalimat yang terasa sulit sampai lancar.",
    ],
    engine: {
      kind: "word-highlight",
      minWpm: 60,
      maxWpm: 160,
      defaultWpm: 90,
      sentences: [
        "Kuku kaki kakekku kaku-kaku seperti paku.",
        "Ular melingkar-lingkar di atas pagar bundar.",
        "Kelapa diparut, kepala digaruk, keduanya jangan tertukar.",
        "Dudung dan Dadang duduk di dipan sambil mendengar dongeng.",
        "Satu ribu berseri biru, dua ribu berseri ungu.",
        "Praktik proklamasi produktif perlu proses persiapan prima.",
      ],
    },
  },
  "pronunciation-practice": {
    slug: "pronunciation-practice",
    title: "Latihan Pengucapan",
    tagline:
      "Rekam diri membaca istilah sulit, lalu dengarkan sendiri — semua tersimpan lokal di browser, tidak diunggah.",
    goalSeconds: 5 * 60,
    instructions: [
      "Baca teks target dengan perlahan dan jelas.",
      "Rekam, lalu putar ulang dan bandingkan dengan yang Anda niatkan.",
      "Ulangi kata yang masih terdengar samar.",
    ],
    engine: {
      kind: "local-record",
      maxSeconds: 90,
      prompt: "Baca teks berikut dengan pengucapan sejelas mungkin:",
      scriptText:
        "Prosedur evakuasi harus disosialisasikan secara sistematis. Statistik menunjukkan produktivitas meningkat signifikan. Kompleksitas infrastruktur memerlukan strategi komprehensif dan kolaborasi lintas divisi.",
    },
  },

  // ── B. Tempo (kecepatan bicara) ──────────────────────────────────────────
  "pause-technique": {
    slug: "pause-technique",
    title: "Teknik Jeda",
    tagline:
      "Sorotan kata akan BERHENTI setiap bertemu tanda //. Gunakan momen itu untuk diam dan mengambil napas.",
    goalSeconds: 5 * 60,
    instructions: [
      "Ikuti sorotan kata sambil membaca lantang.",
      "Saat sorotan berhenti di tanda //, berhentilah bicara sepenuhnya.",
      "Rasakan: jeda membuat Anda terdengar tenang, bukan lambat.",
    ],
    engine: {
      kind: "word-highlight",
      minWpm: 70,
      maxWpm: 130,
      defaultWpm: 100,
      pauseMs: 1500,
      sentences: [
        "Selamat pagi semuanya. // Hari ini, // saya ingin berbagi satu gagasan sederhana // yang bisa mengubah cara Anda berbicara.",
        "Jeda bukanlah kelemahan. // Jeda adalah kekuatan.",
        "Saat Anda berhenti sejenak, // audiens mencerna pesan Anda, // dan Anda mendapatkan kembali kendali napas.",
        "Mari kita berlatih // menggunakan jeda // dengan percaya diri.",
      ],
    },
  },
  "rhythm-training": {
    slug: "rhythm-training",
    title: "Rhythm Training",
    tagline:
      "Metronome visual 110–130 BPM. Ucapkan satu suku kata setiap kedipan untuk menstabilkan tempo bicara.",
    goalSeconds: 5 * 60,
    instructions: [
      "Nyalakan metronome dan rasakan ritmenya dulu beberapa detik.",
      "Baca naskah: satu suku kata per kedipan cahaya.",
      "Tempo ideal percakapan ±120 BPM — jangan balapan dengan lampunya.",
    ],
    engine: {
      kind: "metronome",
      minBpm: 90,
      maxBpm: 140,
      defaultBpm: 120,
      script:
        "Selamat pagi semua. Hari ini kita membahas pentingnya tempo. Bila bicara terlalu cepat, pesan inti mudah hilang. Dengan tempo yang stabil, Anda terdengar tenang, jernih, dan meyakinkan.",
    },
  },

  // ── C. Kepercayaan diri ──────────────────────────────────────────────────
  "confidence-drill": {
    slug: "confidence-drill",
    title: "Confidence Drill",
    tagline:
      "Hitung mundur 3-2-1, lalu proyeksikan afirmasi dengan suara paling lantang dan mantap yang Anda punya.",
    goalSeconds: 4 * 60,
    instructions: [
      "Berdiri tegak, bahu terbuka, tarik napas dalam.",
      "Setelah hitung mundur, ucapkan afirmasi dengan volume penuh.",
      "Ulangi setiap afirmasi minimal dua kali sebelum lanjut.",
    ],
    engine: {
      kind: "countdown-affirmation",
      affirmations: [
        "SAYA SIAP. SAYA MAMPU. SAYA LAYAK DIDENGAR.",
        "SUARA SAYA PUNYA KEKUATAN.",
        "SAYA BERBICARA DENGAN TENANG DAN YAKIN.",
        "IDE SAYA BERHARGA UNTUK DIBAGIKAN.",
        "PANGGUNG INI MILIK SAYA.",
      ],
    },
  },
  "self-recording-practice": {
    slug: "self-recording-practice",
    title: "Rekam & Evaluasi Mandiri",
    tagline:
      "Rekam perkenalan 60 detik, dengarkan ulang, lalu nilai diri sendiri dengan checklist — rekaman tetap di perangkat Anda.",
    goalSeconds: 6 * 60,
    instructions: [
      "Rekam sesuai instruksi, tanpa mengulang dari awal bila tersendat.",
      "Putar ulang dan dengarkan seperti Anda adalah audiensnya.",
      "Isi checklist dengan jujur — kesadaran adalah langkah pertama.",
    ],
    engine: {
      kind: "local-record",
      maxSeconds: 90,
      prompt:
        "Perkenalkan diri Anda selama ±60 detik: nama, profesi, dan satu hal yang membuat Anda bangga.",
      checklist: [
        "Volume suara saya pas dan stabil",
        "Saya tidak terburu-buru",
        "Artikulasi setiap kata jelas",
        "Nada saya bervariasi, tidak datar",
        "Saya terdengar percaya diri",
      ],
    },
  },
  "guided-speaking": {
    slug: "guided-speaking",
    title: "Latihan Bicara Terpandu",
    tagline:
      "Topik berganti otomatis setiap 30 detik. Bicara terus tanpa berhenti — melatih spontanitas tanpa takut salah.",
    goalSeconds: 5 * 60,
    instructions: [
      "Mulai bicara begitu topik muncul — jangan menunggu 'siap'.",
      "Saat topik berganti, langsung pindah tanpa menutup kalimat lama.",
      "Salah itu boleh; berhenti total yang dihindari.",
    ],
    engine: {
      kind: "wizard",
      loop: true,
      steps: [
        { label: "Topik 1", text: "Ceritakan aktivitas pagi Anda hari ini.", seconds: 30 },
        { label: "Topik 2", text: "Jelaskan pekerjaan Anda kepada anak 10 tahun.", seconds: 30 },
        { label: "Topik 3", text: "Yakinkan saya untuk mencoba hobi favorit Anda.", seconds: 30 },
        {
          label: "Topik 4",
          text: "Ceritakan satu pengalaman yang mengubah cara pandang Anda.",
          seconds: 30,
        },
        {
          label: "Topik 5",
          text: "Sampaikan satu pesan untuk diri Anda lima tahun lalu.",
          seconds: 30,
        },
      ],
    },
  },

  // ── D. Intonasi ──────────────────────────────────────────────────────────
  "vocal-variety": {
    slug: "vocal-variety",
    title: "Vocal Variety",
    tagline:
      "Baca cerita dengan nada mengikuti warna: navy = nada rendah, cyan = sedang, aqua terang = tinggi.",
    goalSeconds: 5 * 60,
    instructions: [
      "Perhatikan legenda warna sebelum mulai.",
      "Berlebihanlah sedikit — latihan intonasi memang harus dramatis.",
      "Ulangi 3-4 kali sampai perpindahan nada terasa natural.",
    ],
    engine: {
      kind: "tone-text",
      segments: [
        { text: "Pagi itu, ", tone: "mid" },
        { text: "semuanya tampak biasa saja. ", tone: "low" },
        { text: "Tiba-tiba, ", tone: "high" },
        { text: "telepon berdering! ", tone: "high" },
        { text: "Kabar itu ", tone: "mid" },
        { text: "mengubah segalanya. ", tone: "low" },
        { text: "Kami menang! ", tone: "high" },
        { text: "Proyek yang kami perjuangkan ", tone: "mid" },
        { text: "selama dua tahun penuh, ", tone: "low" },
        { text: "akhirnya disetujui. ", tone: "high" },
        { text: "Dan itu baru permulaan.", tone: "mid" },
      ],
    },
  },
  "emphasis-training": {
    slug: "emphasis-training",
    title: "Emphasis Training",
    tagline:
      "Kata yang tampil BESAR harus diucapkan dengan tekanan dan volume lebih tebal — biarkan mata menuntun suara.",
    goalSeconds: 4 * 60,
    instructions: [
      "Baca paragraf dengan tempo normal.",
      "Setiap kata besar: perlambat sedikit dan tambah tenaga.",
      "Rekam versi Anda di kepala: mana kata yang paling 'menempel'?",
    ],
    engine: {
      kind: "emphasis-text",
      segments: [
        { text: "Kunci presentasi hebat bukan slide yang indah, melainkan " },
        { text: "PESAN", big: true },
        { text: " yang jelas. Audiens hanya akan mengingat " },
        { text: "SATU", big: true },
        { text: " hal — pastikan Anda tahu " },
        { text: "APA", big: true },
        { text: " hal itu. Ulangi pesan inti Anda di " },
        { text: "AWAL", big: true },
        { text: ", di " },
        { text: "TENGAH", big: true },
        { text: ", dan di " },
        { text: "AKHIR", big: true },
        { text: "." },
      ],
    },
  },
  "energy-control": {
    slug: "energy-control",
    title: "Kontrol Energi",
    tagline:
      "Satu teks yang sama, tiga suasana berbeda. Pindah tab dan rasakan bagaimana energi mengubah penyampaian.",
    goalSeconds: 5 * 60,
    instructions: [
      "Baca teks sekali per suasana, berurutan.",
      "Profesional: tenang dan terukur. Antusias: cepat & bersemangat. Empati: lembut dan hangat.",
      "Perhatikan: teksnya sama, maknanya terasa berbeda.",
    ],
    engine: {
      kind: "energy-tabs",
      script:
        "Tim kami baru saja menyelesaikan proyek besar. Prosesnya penuh tantangan, tetapi hasilnya melampaui target. Saya ingin berterima kasih kepada semua yang terlibat.",
      moods: [
        {
          label: "Profesional",
          instruction: "Nada stabil, tempo terukur, akhiri kalimat dengan nada turun.",
          cardClass: "bg-primary-container text-on-primary",
        },
        {
          label: "Sangat Antusias",
          instruction: "Tempo lebih cepat, nada naik, senyum saat bicara — energi 9/10!",
          cardClass: "bg-secondary-container text-on-secondary",
        },
        {
          label: "Empati Tinggi",
          instruction: "Pelan, lembut, beri jeda lebih panjang di antara kalimat.",
          cardClass: "bg-tertiary-container text-white",
        },
      ],
    },
  },

  // ── E. Filler words ──────────────────────────────────────────────────────
  "pause-mastery": {
    slug: "pause-mastery",
    title: "Pause Mastery (Anti-Eee)",
    tagline:
      "Saat otak buntu dan 'eee' mau keluar: TEKAN & TAHAN tombol Blank Space. Layar gelap = izin untuk diam.",
    goalSeconds: 5 * 60,
    instructions: [
      "Bicarakan topik di bawah secara spontan, terus-menerus.",
      "Rasakan filler word naik ke tenggorokan? Tekan dan tahan tombolnya.",
      "Lepas tombol hanya setelah kalimat berikutnya siap di kepala.",
    ],
    engine: {
      kind: "blank-space",
      script:
        "Topik: ceritakan rencana akhir pekan Anda, lalu lanjutkan dengan tempat yang paling ingin Anda kunjungi dan alasannya.",
    },
  },
  "structured-thinking": {
    slug: "structured-thinking",
    title: "Structured Thinking",
    tagline:
      "30 detik menyusun kerangka dalam diam, lalu 60 detik bicara terstruktur. Berpikir dulu, bicara kemudian.",
    goalSeconds: 5 * 60,
    instructions: [
      "Fase persiapan: susun Pembuka → 2 Poin → Penutup di kepala (tanpa bersuara).",
      "Fase bicara: sampaikan sesuai kerangka, jangan tambah poin baru.",
      "Selesai sebelum waktu habis lebih baik daripada melantur.",
    ],
    engine: {
      kind: "wizard",
      loop: true,
      steps: [
        {
          label: "Persiapan (diam)",
          text: "Topik: Apakah bekerja dari rumah lebih produktif? Susun kerangka Anda sekarang.",
          seconds: 30,
        },
        {
          label: "Bicara!",
          text: "Sampaikan pendapat Anda: pembuka, dua alasan, penutup.",
          seconds: 60,
        },
        {
          label: "Persiapan (diam)",
          text: "Topik baru: Keterampilan apa yang paling penting 10 tahun ke depan? Susun kerangka.",
          seconds: 30,
        },
        {
          label: "Bicara!",
          text: "Sampaikan pendapat Anda: pembuka, dua alasan, penutup.",
          seconds: 60,
        },
      ],
    },
  },
  "speaking-awareness": {
    slug: "speaking-awareness",
    title: "Speaking Awareness",
    tagline:
      "Rekam 60 detik, dengarkan ulang, dan tekan +1 setiap kali mendengar 'eee', 'hmm', atau 'anu' dari mulut sendiri.",
    goalSeconds: 6 * 60,
    instructions: [
      "Rekam jawaban Anda tanpa persiapan — biarkan natural.",
      "Saat playback, fokus HANYA menghitung filler word.",
      "0-2 filler: hebat. 3-5: lumayan. Lebih dari 5: ulangi drill ini besok.",
    ],
    engine: {
      kind: "local-record",
      maxSeconds: 90,
      fillerCounter: true,
      prompt:
        "Ceritakan film atau buku terakhir yang Anda nikmati, dan mengapa orang lain perlu mencobanya.",
    },
  },

  // ── F. Struktur ide ──────────────────────────────────────────────────────
  "story-structure": {
    slug: "story-structure",
    title: "Story Structure",
    tagline:
      "Bangun cerita 3 babak: Hook → Story → Lesson. Selesaikan kotak satu per satu dengan kalimat pembuka yang disediakan.",
    goalSeconds: 6 * 60,
    instructions: [
      "Pilih satu pengalaman nyata sebagai bahan cerita.",
      "Aktifkan kotak, pilih kalimat pembuka, lalu bicara sampai timer habis.",
      "Ketiga kotak selesai = satu cerita utuh yang runut.",
    ],
    engine: {
      kind: "structure-boxes",
      boxes: [
        {
          title: "1. The Hook",
          hint: "Rebut perhatian: pertanyaan, fakta mengejutkan, atau adegan.",
          starters: ["Tahukah Anda bahwa...", "Bayangkan jika...", "Tiga tahun lalu, saya..."],
          seconds: 40,
        },
        {
          title: "2. Story & Body",
          hint: "Inti cerita dengan metode STAR: Situasi, Tantangan, Aksi, Hasil.",
          starters: ["Situasinya begini...", "Tantangan terbesarnya...", "Yang saya lakukan..."],
          seconds: 60,
        },
        {
          title: "3. Lesson & CTA",
          hint: "Tutup dengan pelajaran dan ajakan yang jelas.",
          starters: ["Pelajaran terbesarnya...", "Mulai hari ini, cobalah..."],
          seconds: 40,
        },
      ],
    },
  },
  "framework-speaking": {
    slug: "framework-speaking",
    title: "Framework P.R.E.P",
    tagline:
      "Bicara terstruktur dengan formula P.R.E.P: Point → Reason → Example → Point. Kartu menyala berurutan memandu Anda.",
    goalSeconds: 5 * 60,
    instructions: [
      "Pilih satu opini sederhana (mis. 'olahraga pagi itu penting').",
      "Ikuti kartu yang menyala; gunakan kalimat pembukanya.",
      "Satu putaran P.R.E.P = ±2 menit opini yang meyakinkan.",
    ],
    engine: {
      kind: "wizard",
      loop: true,
      steps: [
        {
          label: "P — Point",
          text: "Nyatakan pendapat utama Anda. Mulai dengan: \"Menurut saya...\"",
          seconds: 25,
        },
        {
          label: "R — Reason",
          text: "Berikan alasan terkuatnya. Mulai dengan: \"Karena...\"",
          seconds: 30,
        },
        {
          label: "E — Example",
          text: "Beri contoh nyata/pengalaman. Mulai dengan: \"Contohnya...\"",
          seconds: 35,
        },
        {
          label: "P — Point (tegas ulang)",
          text: "Tutup dengan menegaskan kembali. Mulai dengan: \"Oleh karena itu...\"",
          seconds: 25,
        },
      ],
    },
  },
  "opening-closing": {
    slug: "opening-closing",
    title: "Opening & Closing",
    tagline:
      "Bandingkan pembuka/penutup klise vs berdampak tinggi, lalu praktikkan versi baiknya dengan suara lantang.",
    goalSeconds: 5 * 60,
    instructions: [
      "Baca versi buruk dalam hati — kenali polanya agar bisa dihindari.",
      "Ucapkan versi baik dengan lantang, 2-3 kali.",
      "Sembunyikan teksnya, lalu coba ucapkan ulang dengan kata-kata sendiri.",
    ],
    engine: {
      kind: "comparison",
      pairs: [
        {
          title: "Pembuka",
          bad: "Ehm, jadi... perkenalkan, nama saya... maaf ya kalau agak gugup.",
          good: "Tahukah Anda? Kebanyakan orang lebih takut berbicara di depan umum daripada ketinggian. Lima menit ke depan, saya tunjukkan cara menaklukkannya.",
          note: "Jangan buka dengan permintaan maaf — buka dengan rasa penasaran.",
        },
        {
          title: "Pembuka",
          bad: "Sebelumnya mohon maaf apabila presentasi saya kurang menarik dan ada salah kata.",
          good: "Bayangkan presentasi berikutnya membuat ruangan hening — bukan karena bosan, tapi karena semua menyimak. Itu tujuan kita hari ini.",
          note: "Permintaan maaf di awal menurunkan otoritas Anda sebelum mulai.",
        },
        {
          title: "Penutup",
          bad: "Ya... mungkin itu saja dari saya. Terima kasih.",
          good: "Ingat satu hal ini: audiens tidak mengingat slide Anda — mereka mengingat keyakinan Anda. Mulailah berlatih hari ini.",
          note: "Penutup adalah kalimat yang paling diingat — jangan disia-siakan.",
        },
      ],
    },
  },
};

/** Daily practice goal (PRD: "Logika 10 Menit Sehari"). */
export const DAILY_GOAL_MINUTES = 10;
