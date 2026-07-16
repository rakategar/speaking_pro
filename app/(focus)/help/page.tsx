"use client";

import { useState } from "react";
import { TopAppBar } from "@/components/layout/TopAppBar";

const SUPPORT_WA = "6285930006425";
const SUPPORT_EMAIL = "support@speakingpro.online";

type Tab = "faq" | "support" | "panduan" | "laporan";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "faq", label: "FAQ", icon: "help" },
  { id: "support", label: "Support", icon: "support_agent" },
  { id: "panduan", label: "Panduan", icon: "menu_book" },
  { id: "laporan", label: "Laporan", icon: "bug_report" },
];

export default function HelpPage() {
  const [tab, setTab] = useState<Tab>("faq");

  return (
    <div className="min-h-screen bg-background">
      <TopAppBar variant="back" title="Bantuan & Dukungan" />
      <main className="pt-[90px] pb-16 px-margin-mobile max-w-2xl mx-auto flex flex-col gap-6">
        {/* Tab switcher */}
        <div className="grid grid-cols-4 gap-2 bg-surface-container rounded-2xl p-1.5">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${
                  active
                    ? "bg-surface-card shadow-soft text-secondary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {t.icon}
                </span>
                <span className="font-label-sm text-label-sm">{t.label}</span>
              </button>
            );
          })}
        </div>

        {tab === "faq" && <FaqTab />}
        {tab === "support" && <SupportTab />}
        {tab === "panduan" && <PanduanTab />}
        {tab === "laporan" && <LaporanTab />}
      </main>
    </div>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────── */

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Bagaimana cara memulai latihan pertama saya?",
    a: "Setelah menyelesaikan onboarding, buka tab Home. Di sana ada rekomendasi 'Latihan Harian' dan pustaka modul di tab Library. Pilih satu modul, ikuti instruksinya, lalu masuk ke Studio Rekaman untuk merekam. Untuk hasil terbaik, latihlah di ruangan yang tenang dengan mikrofon yang jelas.",
  },
  {
    q: "Apa arti skor Confidence, Clarity, Struktur, Intonasi, WPM, dan Filler?",
    a: "Confidence menilai ketegasan dan stabilitas suara Anda. Clarity menilai kejelasan artikulasi. Struktur menilai keteraturan alur pembicaraan (pembuka–isi–penutup). Intonasi menilai variasi nada agar tidak monoton. WPM (words per minute) adalah kecepatan bicara — ideal 110–150 kata/menit. Filler menghitung kata pengisi seperti 'eee', 'anu', 'jadi…' yang sebaiknya dikurangi. Skor keseluruhan (Overall) adalah rangkuman dari semua aspek ini.",
  },
  {
    q: "Berapa lama analisis rekaman saya selesai?",
    a: "Rekaman Anda masuk antrean AI dan biasanya selesai dalam 1–3 menit tergantung durasi. Anda tidak perlu menunggu di halaman — kami akan mengirim notifikasi push ke perangkat Anda begitu rapor siap. Anda juga bisa cek statusnya kapan saja di tab Riwayat.",
  },
  {
    q: "Kenapa saya hanya bisa merekam 30 detik?",
    a: "Batas 30 detik berlaku untuk masa uji coba (trial). Setelah berlangganan Premium, batas rekaman naik hingga 5 menit dan Anda mendapat analisa lengkap tanpa batasan tampilan. Anda bisa upgrade kapan saja dari menu Pro Shop atau tombol Berlangganan di halaman Profile.",
  },
  {
    q: "Bagaimana cara berlangganan Premium dan metode pembayarannya?",
    a: "Buka Profile atau Pro Shop, pilih paket Premium, lalu lanjutkan ke pembayaran. Pembayaran diproses aman melalui Midtrans dan mendukung transfer bank, e-wallet (GoPay, dsb.), serta kartu. Status langganan otomatis aktif begitu pembayaran terkonfirmasi — tanpa perlu memasukkan kode manual.",
  },
  {
    q: "Saya sudah bayar tapi status masih Free. Apa yang harus saya lakukan?",
    a: "Umumnya status diperbarui dalam beberapa detik setelah pembayaran berhasil. Jika setelah beberapa menit belum aktif, coba tutup dan buka ulang aplikasi. Bila masih belum berubah, kirimkan bukti pembayaran melalui tab Laporan (kategori Pembayaran) atau hubungi kami via WhatsApp di tab Support.",
  },
  {
    q: "Bagaimana cara mengaktifkan notifikasi?",
    a: "Saat pertama kali membuka Studio Rekaman, aplikasi akan meminta izin notifikasi — pilih 'Izinkan'. Jika sebelumnya Anda menolak, aktifkan kembali lewat pengaturan browser/perangkat pada situs ini. Notifikasi dipakai untuk memberi tahu Anda saat analisis selesai dan pengingat latihan harian.",
  },
  {
    q: "Apakah rekaman suara saya aman dan privat?",
    a: "Ya. Rekaman disimpan di penyimpanan privat dan hanya dapat diakses oleh akun Anda. File digunakan semata-mata untuk menghasilkan rapor analisa Anda dan tidak dibagikan ke pengguna lain. Anda dapat menghapus rekaman dari tab Riwayat kapan saja.",
  },
  {
    q: "Bagaimana cara mengubah nama, pekerjaan, atau foto profil?",
    a: "Buka Profile → Account Settings. Ketuk 'Edit Profil' untuk mengganti nama dan pekerjaan, dan ketuk ikon kamera pada foto profil untuk mengunggah foto baru (JPG/PNG/WebP, maks 2 MB).",
  },
];

function FaqTab() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="flex flex-col gap-3">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Pertanyaan yang paling sering ditanyakan pengguna Speaking Pro.
      </p>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="bg-surface-card rounded-2xl border border-stroke-subtle/60 shadow-soft overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-3 text-left px-5 py-4"
            >
              <span className="font-label-md text-label-md text-primary">
                {item.q}
              </span>
              <span
                className={`material-symbols-outlined text-on-surface-variant transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                expand_more
              </span>
            </button>
            {isOpen && (
              <p className="px-5 pb-5 -mt-1 font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ───────────────────────────── Support ───────────────────────────── */

function SupportTab() {
  return (
    <section className="flex flex-col gap-4">
      <div className="bg-surface-card rounded-3xl border border-stroke-subtle/60 shadow-soft p-6 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-secondary-container/15 flex items-center justify-center text-secondary">
          <span className="material-symbols-outlined text-[28px]">
            support_agent
          </span>
        </div>
        <h2 className="font-title-lg text-title-lg text-primary">
          Butuh bantuan langsung?
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Tim support kami siap membantu Anda seputar akun, pembayaran, atau
          kendala teknis. Hubungi kami dan biasanya kami balas di jam kerja.
        </p>
        <a
          href={`https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(
            "Halo Speaking Pro, saya butuh bantuan mengenai ",
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary px-6 py-3.5 rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition"
        >
          <span className="material-symbols-outlined text-[20px]">call</span>
          Chat / Telepon via WhatsApp
        </a>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          +{SUPPORT_WA}
        </span>
      </div>

      <div className="bg-surface-card rounded-3xl border border-stroke-subtle/60 shadow-soft p-6 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-secondary">
            schedule
          </span>
          <div>
            <p className="font-label-md text-label-md text-primary">
              Jam Operasional
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Senin–Jumat, 09.00–17.00 WIB. Pesan di luar jam kerja akan kami
              balas pada hari kerja berikutnya.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-secondary">mail</span>
          <div>
            <p className="font-label-md text-label-md text-primary">Email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-body-md text-body-md text-secondary underline underline-offset-2"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-secondary">
            bug_report
          </span>
          <div>
            <p className="font-label-md text-label-md text-primary">
              Melaporkan bug?
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Gunakan tab Laporan agar tim kami menerima detail lengkap beserta
              screenshot.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Panduan ───────────────────────────── */

const GUIDE_STEPS: { title: string; body: string }[] = [
  {
    title: "1. Lengkapi Onboarding",
    body: "Saat pertama masuk, jawab beberapa pertanyaan singkat tentang tujuan dan level bicara Anda. Jawaban ini dipakai untuk menyesuaikan rekomendasi latihan harian Anda.",
  },
  {
    title: "2. Kenali Dashboard",
    body: "Tab Home menampilkan streak latihan, statistik, dan rekomendasi 'Latihan Harian'. Mulailah dari sini setiap hari agar progres Anda konsisten.",
  },
  {
    title: "3. Pilih Modul di Library",
    body: "Buka tab Library untuk menjelajah modul: dari drill dasar (AIUEO, pernapasan, artikulasi) hingga latihan lanjutan (struktur berpikir, pembuka–penutup). Ketuk modul untuk melihat detail lalu tekan 'Mulai Latihan'.",
  },
  {
    title: "4. Rekam di Studio",
    body: "Di Studio Rekaman, pilih atmosfer (mis. panggung CEO), tekan rekam, dan bicaralah minimal 15 detik. Jaga jarak wajar dari mikrofon dan bicara dengan tempo alami. Tekan stop bila selesai.",
  },
  {
    title: "5. Tunggu Analisis AI",
    body: "Rekaman Anda masuk antrean dan dianalisis otomatis. Anda bisa menutup halaman — notifikasi akan muncul saat rapor siap (biasanya 1–3 menit).",
  },
  {
    title: "6. Baca Rapor Anda",
    body: "Buka rapor untuk melihat transkrip, skor per aspek (Confidence, Clarity, Struktur, Intonasi, WPM, Filler), insight dari AI/coach, dan langkah selanjutnya. Ulangi latihan untuk melihat tren peningkatan dari waktu ke waktu.",
  },
  {
    title: "7. Jaga Streak & Naik Level",
    body: "Latihan rutin setiap hari menjaga streak Anda tetap hidup dan menaikkan Speaking Level di profil. Konsistensi adalah kunci peningkatan kemampuan bicara.",
  },
];

function PanduanTab() {
  return (
    <section className="flex flex-col gap-4">
      <p className="font-body-md text-body-md text-on-surface-variant">
        Panduan langkah demi langkah menggunakan Speaking Pro dari awal hingga
        membaca hasil analisa Anda.
      </p>
      <ol className="flex flex-col gap-3">
        {GUIDE_STEPS.map((step, i) => (
          <li
            key={i}
            className="bg-surface-card rounded-2xl border border-stroke-subtle/60 shadow-soft p-5 flex gap-4"
          >
            <div className="w-8 h-8 shrink-0 rounded-full bg-secondary-container/15 text-secondary flex items-center justify-center font-label-md text-label-md">
              {i + 1}
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-label-md text-label-md text-primary">
                {step.title}
              </p>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────────────────────── Laporan ───────────────────────────── */

const REPORT_CATEGORIES: { value: string; label: string }[] = [
  { value: "bug", label: "Bug / Error Aplikasi" },
  { value: "pembayaran", label: "Masalah Pembayaran" },
  { value: "akun", label: "Masalah Akun / Login" },
  { value: "saran", label: "Saran / Masukan" },
  { value: "lainnya", label: "Lainnya" },
];

function LaporanTab() {
  const [category, setCategory] = useState("bug");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const body = new FormData();
      body.append("category", category);
      body.append("message", message.trim());
      if (file) body.append("screenshot", file);
      const res = await fetch("/api/help/report", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ ok: false, text: json.error ?? "Gagal mengirim laporan." });
        return;
      }
      setNotice({
        ok: true,
        text: "Laporan Anda terkirim. Terima kasih — tim kami akan menindaklanjuti.",
      });
      setMessage("");
      setFile(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-surface-card rounded-3xl border border-stroke-subtle/60 shadow-soft p-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-title-lg text-title-lg text-primary">
          Laporkan Masalah
        </h2>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Sampaikan kendala atau masukan Anda. Sertakan screenshot bila perlu
          agar tim kami lebih cepat memahami masalahnya.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="report-category"
            className="block font-label-md text-label-md text-on-surface-variant mb-2"
          >
            Kategori
          </label>
          <select
            id="report-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3 px-4 text-body-md text-on-surface focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition"
          >
            {REPORT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="report-message"
            className="block font-label-md text-label-md text-on-surface-variant mb-2"
          >
            Deskripsi masalah
          </label>
          <textarea
            id="report-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Ceritakan apa yang terjadi, langkah yang Anda lakukan, dan apa yang Anda harapkan..."
            className="w-full rounded-2xl border border-outline-variant bg-surface-card py-3 px-4 text-body-md text-on-surface focus:border-secondary-container focus:outline-none focus:ring-2 focus:ring-secondary-container/30 transition resize-none"
          />
        </div>

        <div>
          <span className="block font-label-md text-label-md text-on-surface-variant mb-2">
            Screenshot (opsional)
          </span>
          <label className="flex items-center gap-3 cursor-pointer rounded-2xl border border-dashed border-outline-variant px-4 py-3 hover:border-secondary-container transition">
            <span className="material-symbols-outlined text-on-surface-variant">
              attach_file
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant truncate">
              {file ? file.name : "Pilih gambar (JPG/PNG/WebP, maks 2 MB)"}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
        </div>

        {notice && (
          <p
            role="status"
            className={`rounded-2xl px-4 py-3 font-label-md text-label-md ${
              notice.ok
                ? "bg-secondary-fixed text-on-secondary-fixed"
                : "bg-error-container text-on-error-container"
            }`}
          >
            {notice.text}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || message.trim().length < 10}
          className="self-start bg-primary-container text-on-primary px-8 py-3 rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition disabled:opacity-50"
        >
          {submitting ? "Mengirim..." : "Kirim Laporan"}
        </button>
      </form>
    </section>
  );
}
