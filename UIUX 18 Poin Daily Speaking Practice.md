# PRODUCT REQUIREMENT DOCUMENT (PRD)
## MODULE: 18-POINT DAILY SPEAKING PRACTICE SYSTEM (ZERO-SERVER ACQUISITION)
**Version:** 1.1 (Production-Ready for Lovable & Claude)
**Target Platform:** Mobile-First WebApp / PWA

---

## 1. SYSTEM ARCHITECTURE LOGIC (ZERO-SERVER COST)
Untuk menghindari biaya server berkelanjutan atau latensi API AI selama latihan harian, sistem ini menggunakan arsitektur **"One-Time Token, Local-First Engine"**:
1. **Weekly Anchor Trigger**: Di awal minggu, pengguna mengunggah 1 rekaman audio berdurasi maksimal 5 menit.
2. **AI Payload Generation**: Sistem AI menganalisis rekaman tersebut sekali saja, lalu mengembalikan 1 objek data JSON kecil berisi flag problematik pengguna (Contoh: `is_articulation_low: true`, `is_speed_fast: true`)[cite: 3].
3. **Client-Side Automation**: Aplikasi di sisi klien (*browser*) membaca JSON tersebut dan secara otomatis memetakan jadwal latihan 10 menit harian menggunakan komponen UI interaktif berbasis CSS, Vanilla JS, dan penyimpanan lokal HTML5 Audio Media[cite: 3]. Tidak ada data audio latihan harian yang dikirim ke server.

---

## 2. DESIGN DESIGN SYSTEM & VISUAL CONSISTENCY MANDATE
AI Generator (Lovable/Stitch) **WAJIB** mematuhi panduan gaya terpadu berikut demi menjaga konsistensi dengan aset desain Speaking Pro™ lainnya:
* **Font Family**: `Plus Jakarta Sans` (Untuk Heading/Metrik) dan `Inter` (Untuk Teks/Instruksi).
* **Color Palette (Exact Tokens)**:
  * Background Utama: `#F8FAFC` (Slate 50) — *Latar bersih, non-glare*.
  * Teks & Card Utama: `#0A192F` (Deep Corporate Navy) — *Kesan premium & kokoh*.
  * Tombol & Aksen Aktif: `#00A3FF` (Electric Cyan Blue) — *Energetik & modern*.
  * Progress Bar & Glow Elements: `#00E5FF` (Light Aqua) — *Responsif & interaktif*.
* **UI Component Treatment**: Seluruh komponen latihan harian wajib dibungkus dalam modul **Bento Grid** dengan sudut melengkung halus `rounded-2xl` atau `rounded-3xl` (20px - 24px) dan efek *soft ambient shadow*.

---

## 3. COMPREHENSIVE CONCEPT OF THE 18 POINTS DAILY DRILL

Berikut adalah rincian fungsionalitas UI untuk ke-18 poin latihan harian yang bersifat interaktif, taktis, dan 100% berjalan di sisi klien (client-side):

### KATEGORI A: ARTIDULASI KURANG JELAS[cite: 3]
#### 1. AIUEO Drill[cite: 3]
* **Konsep UI**: Komponen kartu bento besar yang menampilkan huruf vokal statis (A - I - U - E - O) bergantian setiap 3 detik.
* **Mekanisme Klien**: Animasi CSS `pulse` berkedip pada huruf yang aktif disertai ikon ilustrasi bentuk mulut yang benar. Menggunakan timer Javascript biasa.

#### 2. Articulation Exercise[cite: 3]
* **Konsep UI**: Komponen mirip *Teleprompter* mini yang menampilkan kalimat-kalimat pendek dengan konsonan ganda dominan (misal: "Kuku kaki kakekku kaku-kaku").
* **Mekanisme Klien**: Teks berjalan otomatis secara horizontal dengan tombol pengatur kecepatan membaca (*slider* JS).

#### 3. Pronunciation Practice[cite: 3]
* **Konsep UI**: Kartu split-view yang menampilkan teks target pengucapan di sisi atas dan audio bar lokal di sisi bawah.
* **Mekanisme Klien**: Tombol "Rekam & Dengar Mandiri". Menggunakan `MediaRecorder API` lokal yang merekam suara lalu menyimpannya di memori *browser (Blob URL)* agar user bisa mendengarkan suaranya sendiri tanpa proses *upload*.

---

### KATEGORI B: KECEPATAN BICARA TERLALU CEPAT[cite: 3]
#### 4. Breathing Control[cite: 3]
* **Konsep UI**: Lingkaran visual konseptual berlatar belakang gradasi Cyan-Aqua di tengah layar yang membesar dan mengecil secara ritmis.
* **Mekanisme Klien**: Animasi CSS Keyframes menuntun teknik *Box Breathing*: 4 detik lingkaran membesar (Tarik napas), 4 detik diam (Tahan), 4 detik mengecil (Hembuskan napas).

#### 5. Pause Technique[cite: 3]
* **Konsep UI**: Lembaran teks pidato pendek di mana di antara frasa disisipkan simbol garis miring ganda yang tegas (`//`).
* **Mekanisme Klien**: Indikator *highlight* teks akan melompati kata demi kata, dan akan berhenti total selama 1.5 detik setiap kali menemui simbol `//` sebagai panduan visual pengguna untuk berhenti mengambil napas.

#### 6. Rhythm Training[cite: 3]
* **Konsep UI**: Sebuah komponen *Bento Metronome* visual.
* **Mekanisme Klien**: Menggunakan JS `setInterval` untuk memicu pendaran lampu warna Aqua Blue berkedip konstan pada rentang tempo 110 - 130 BPM. Pengguna dilatih mengucapkan satu suku kata per satu kedipan visual.

---

### KATEGORI C: KURANG PERCAYA DIRI[cite: 3]
#### 7. Confidence Speaking Drill[cite: 3]
* **Konsep UI**: Desain kartu premium dengan latar belakang gelap gelap `--primary-navy` berisi teks afirmasi bernada tinggi dan berani.
* **Mekanisme Klien**: Tombol hitung mundur interaktif (*Countdowns* 3-2-1) yang langsung memicu perubahan ukuran font teks menjadi masif untuk menuntut proyeksi suara yang mantap.

#### 8. Self-Recording Practice[cite: 3]
* **Konsep UI**: Tombol toggle audio player lokal yang terintegrasi dengan emotikon evaluasi personal.
* **Mekanisme Klien**: Setelah latihan membaca teks, user memutar ulang rekaman lokalnya sendiri dan mencentang *self-assessment checklist* mandiri di layar (Contoh: "Apakah saya menunduk?", "Apakah volume pas?").

#### 9. Guided Speaking Exercise[cite: 3]
* **Konsep UI**: Tampilan bertahap (*Wizard-step UI*). 
* **Mekanisme Klien**: Menampilkan petunjuk skrip terpandu yang berganti otomatis per 30 detik untuk melatih spontanitas tanpa rasa takut salah.

---

### KATEGORI D: INTONASI MONOTON[cite: 3]
#### 10. Vocal Variety[cite: 3]
* **Konsep UI**: Teks cerita fiksi pendek yang menggunakan tipografi dengan warna berkode khusus secara dinamis.
* **Mekanisme Klien**: Kata berwarna Biru Tua berarti diucapkan dengan nada rendah, kata berwarna Cyan untuk nada sedang, dan kata berwarna Kuning-Aqua menyala untuk nada tinggi.

#### 11. Emphasis Training[cite: 3]
* **Konsep UI**: Satu paragraf teks yang beberapa kata kuncinya memiliki ukuran 200% lebih besar dari kata lainnya.
* **Mekanisme Klien**: Desain visual memaksa mata pengguna untuk memberikan tekanan volume suara yang lebih tebal pada kata-kata besar tersebut secara natural.

#### 12. Energy Control[cite: 3]
* **Konsep UI**: Satu teks pendek yang sama, tetapi diletakkan di bawah 3 tab tombol suasana emosi: [Profesional], [Sangat Antusias], [Empati Tinggi].
* **Mekanisme Klien**: Mengubah tab akan mengubah skema warna kartu latihan untuk mengondisikan psikologis pengguna saat membaca.

---

### KATEGORI E: BANYAK FILLER WORDS[cite: 3]
#### 13. Pause Mastery[cite: 3]
* **Konsep UI**: Kartu peringatan visual "Anti-Ee-Anu".
* **Mekanisme Klien**: Saat pengguna berbicara membaca teks, terdapat tombol besar bertuliskan "Blank Space". Jika otak berpikir buntu, desains mengarahkan pengguna menekan tombol tersebut untuk memicu indikator visual keheningan (layar menjadi gelap sejenak), mendidik user memilih diam daripada mengeluarkan suara *filler words*[cite: 3].

#### 14. Structured Thinking Exercise[cite: 3]
* **Konsep UI**: Komponen kotak persiapan yang membagi durasi berpikir dan durasi berbicara.
* **Mekanisme Klien**: Sesi persiapan 30 detik (Teks tersembunyi), disusul sesi bicara bebas selama 1 menit yang dipandu oleh pengukur waktu (*timer*) melingkar di sisi klien.

#### 15. Speaking Awareness Training[cite: 3]
* **Konsep UI**: Dasbor penghitung (*Counter Widget*).
* **Mekanisme Klien**: User mendengarkan kembali rekaman lokal mereka, dan di bawah player terdapat tombol besar "+1 Filler Word". Setiap kali user mendengar dirinya mengucap "eee" atau "hmm", mereka mengetuk layar untuk menghitung jumlah kesalahan secara sadar[cite: 3].

---

### KATEGORI F: KESULITAN MENYUSUN IDE[cite: 3]
#### 16. Story Structure[cite: 3]
* **Konsep UI**: 3 Buah Kotak Bento berurutan vertikal atau horizontal: [Hook] ➔ [Story/Body] ➔ [Lesson/Call to Action][cite: 3].
* **Mekanisme Klien**: UI membatasi baris input atau petunjuk kata pembuka kaku di masing-masing kotak untuk memaksa pengguna berpikir runut.

#### 17. Framework Speaking[cite: 3]
* **Konsep UI**: Papan visual formula komunikasi populer (Contoh: P.R.E.P - Point, Reason, Example, Point).
* **Mekanisme Klien**: Menampilkan 4 kartu bertahap yang menyala berurutan sesuai alur presentasi terstruktur pengguna.

#### 18. Opening & Closing Practice[cite: 3]
* **Konsep UI**: Split screen kiri dan kanan. Sisi kiri adalah komparasi template pembuka buruk/klise, sisi kanan template pembuka berdampak tinggi.
* **Mekanisme Klien**: Tombol interaktif untuk menyalakan/mematikan teks sebagai panduan latihan komparatif.

---

## 4. UI TECHNICAL INSTRUCTION FOR GOOGLE STITCH / LOVABLE
*   **Zero External Requests**: Jangan buat fungsi `Fetch` atau HTTP request apa pun ke API eksternal saat tombol modul latihan harian diklik. Semua data skrip teks sudah di-hardcode dalam file komponen berbentuk objek array konstan.
*   **State Alignment**: Gunakan React State local untuk melacak penyelesaian durasi latihan harian (10 Menit) sebelum mengirim status `is_completed: true` ke basis data Supabase pengguna di akhir sesi[cite: 3].