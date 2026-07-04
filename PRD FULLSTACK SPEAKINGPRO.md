# MASTER PRD: FULL-STACK WEBAPP SPEAKING PRO™
**Version:** 1.0 (MVP Beta Program)
**Target Execution:** AI Coding Agents (Lovable untuk UI/Frontend, Claude/Cursor untuk Backend/Logic)
**Architecture Type:** Mobile-First Progressive Web App (PWA)

---

## 1. TECH STACK & SYSTEM ARCHITECTURE
AI Agent wajib menggunakan *stack* teknologi berikut untuk memastikan skalabilitas dan kecepatan pengembangan:

*   **Frontend Framework:** React.js (Vite) atau Next.js 14 (App Router).
*   **Styling & UI Components:** Tailwind CSS, Shadcn UI (untuk komponen dasar seperti Button, Card, Dialog), Framer Motion (untuk animasi transisi halaman yang *smooth* khas *mobile app*).
*   **Backend & Database (BaaS):** Supabase (PostgreSQL untuk *database*, Supabase Auth untuk *login*, Supabase Storage untuk menyimpan *file audio*).
*   **State Management:** Zustand (ringan dan efisien untuk melacak status latihan harian).
*   **Audio Processing:** HTML5 `MediaRecorder API` (untuk merekam suara langsung dari *browser*).
*   **Charts/Data Viz:** Recharts (untuk merender grafik *Progress Snap*).

---

## 2. DESIGN SYSTEM & VISUAL TOKENS
Pastikan antarmuka mengikuti parameter eksak ini untuk konsistensi desain premium:

*   **Typography:** 'Plus Jakarta Sans' (Primary) atau 'Inter'.
*   **Color Palette:**
    *   `--primary-navy`: `#0A192F` (Gunakan untuk teks utama, *header*, dan *card highlight* khusus).
    *   `--brand-cyan`: `#00A3FF` (Gunakan untuk tombol utama, indikator aktif).
    *   `--brand-aqua`: `#00E5FF` (Gunakan untuk pendaran/glow, *progress bar*, grafik).
    *   `--bg-main`: `#F8FAFC` (Slate 50 - Latar belakang aplikasi, BUKAN putih murni agar tidak menyilaukan).
    *   `--surface-card`: `#FFFFFF` (Warna dasar komponen *Bento Card*).
*   **Border Radius:** 
    *   *Cards/Bento*: `rounded-2xl` atau `rounded-3xl` (20px - 24px).
    *   *Buttons*: `rounded-full` (Pill shape).
*   **Shadows (Glassmorphism ringan):** `box-shadow: 0 4px 20px rgba(0, 163, 255, 0.05)`.

---

## 3. DATABASE SCHEMA (SUPABASE POSTGRESQL)
AI *Backend* (Claude) harus menginisialisasi skema tabel berikut:

**Table 1: `users`**
*   `id` (uuid, primary key, auth.uid)
*   `full_name` (text)
*   `email` (text)
*   `whatsapp_number` (text)
*   `created_at` (timestamp)
*   `current_week` (integer, default 1)

**Table 2: `daily_practices`**
*   `id` (uuid, primary key)
*   `user_id` (uuid, foreign key -> users.id)
*   `date` (date)
*   `module_category` (text) // cth: Articulation, Pacing, Breathing[cite: 3].
*   `duration_minutes` (integer, default 10)[cite: 3].
*   `is_completed` (boolean, default false)

**Table 3: `weekly_submissions`**
*   `id` (uuid, primary key)
*   `user_id` (uuid, foreign key -> users.id)
*   `week_number` (integer)
*   `audio_file_url` (text) // Link dari Supabase Storage
*   `duration_seconds` (integer) // Maks 300 detik (5 menit)[cite: 3].
*   `ai_feedback` (text, nullable)
*   `coach_feedback` (text, nullable) // Dari Coach Faisal
*   `score_confidence` (integer, 0-100)[cite: 3].
*   `score_clarity` (integer, 0-100)[cite: 3].
*   `score_structure` (integer, 0-100)[cite: 3].
*   `status` (enum: 'pending', 'analyzing', 'reviewed')

---

## 4. CORE BUSINESS LOGIC & CONSTRAINTS (SANGAT PENTING)
Instruksikan AI untuk menerapkan validasi logika ini dengan ketat:

1.  **Logika 10 Menit Sehari:** Pengguna wajib menyelesaikan *Daily Drill* minimal 10 menit sebelum status hari itu berubah menjadi 'Completed'[cite: 3]. Tombol centang *checklist* hanya aktif jika *timer* aplikasi telah berjalan selama waktu yang ditentukan.
2.  **Batas Waktu Audio:** Saat melakukan *Weekly Submission*, API `MediaRecorder` harus melakukan penghentian otomatis (*auto-stop*) tepat pada detik ke-300 (5 menit)[cite: 3].
3.  **Progression Gate:** *User* tidak bisa melompat ke *Weekly Submission* minggu ke-2 jika skor dan *feedback* minggu ke-1 belum berstatus 'reviewed'.

---

## 5. SCREEN-BY-SCREEN SPECIFICATIONS (UI/UX)

**Komponen Global:** *Bottom Navigation Bar* tetap (*fixed bottom*) berjenis *glassmorphism* dengan 4 ikon: Home, Practice, Record, Profile.

### Screen 1: Dashboard (Home)
*   **Header:** `Avatar`, Sapaan Dinamis ("Good Morning, [Nama]"), Ikon Lonceng Notifikasi.
*   **Hero Card (Today's Drill):** 
    *   Bento card besar berlatar belakang gradasi tipis putih ke Cyan.
    *   Menampilkan rekomendasi AI hari ini (cth: "Day 3: Pause Mastery - 10 Min")[cite: 3].
    *   Terdapat 7 titik bulat (Senin-Minggu) sebagai indikator *streak*.
    *   CTA: "Start Daily Practice".
*   **Action Card (Weekly Submission):**
    *   Card berlatar gelap `--primary-navy`.
    *   Visual animasi *audio wave* kecil statis.
    *   Teks: "Submission Week [X]"[cite: 3]. Status: Pending/Submitted.
*   **Progress Widget:** Grafik garis mini (Recharts) melacak kenaikan *Performance Index* keseluruhan dari minggu ke minggu[cite: 3].

### Screen 2: Practice Library
*   **Search & Filter:** *Input text* "Cari latihan..." dan filter bentuk *Chips* (Semua, Artikulasi, Intonasi, Struktur, Kepercayaan Diri)[cite: 3].
*   **List Layout (Vertical):** Daftar modul berdesain kartu ramping.
*   **Isi Kartu:** Ikon 3D abstrak kecil, Judul (cth: AIUEO Drill), durasi (3-10 Menit), tingkat kesulitan[cite: 3].

### Screen 3: Recording Studio (Tampilan Bebas Distraksi)
*   **Layout:** Sentris. Tidak ada *bottom navigation bar* saat proses perekaman berlangsung.
*   **Visual Inti:** Tombol Mikrofon membulat besar di tengah layar.
*   **Animasi Aktif:** Ketika ditekan, mikrofon berubah warna menjadi merah, muncul visualisasi *audio visualizer/wave* yang bereaksi terhadap suara.
*   **Timer Digital:** Bergerak naik `00:00` -> `05:00`. Warna teks timer berubah kemerahan saat masuk `04:30`.
*   **Controls:** *Pause*, *Resume*, *Stop & Review* (Muncul audio player kecil untuk mendengarkan ulang sebelum dikirim).
*   **UX Note:** Tambahkan modal konfirmasi "Apakah Anda yakin ini rekaman terbaik Anda minggu ini?" sebelum proses *upload* ke Supabase.

### Screen 4: Analytics & Feedback
*   **Score Header:** Menampilkan metrik utama berbentuk donat/lingkaran radial untuk 3 pilar: *Confidence*, *Clarity*, *Structure*[cite: 3, 4].
*   **Coach/AI Notes Box:** Kotak *rich-text* elegan dengan garis tepi kiri biru (`border-l-4`), memuat hasil analisis spesifik.
*   **Action Plan:** Berdasarkan *feedback* ini, sistem meng-update rekomendasi di layar *Dashboard (Home)* untuk minggu depan[cite: 3].

---

## 6. PWA REQUIREMENTS (PROGRESSIVE WEB APP)
Agar web bisa di-*install* di HP seperti aplikasi *native*:
1.  **manifest.json:** Harus ada. Nama: "Speaking Pro", `display`: "standalone", `theme_color`: "#0A192F", `background_color`: "#F8FAFC". Sertakan ikon ukuran 192x192 dan 512x512.
2.  **Service Worker:** Wajib ada. Meng-cache aset UI dan memberikan layar *fallback offline* yang elegan ("Anda sedang offline, tapi progres Anda hari ini tetap tersimpan secara lokal").

---

## 7. AI IMPLEMENTATION PROMPTS (COPY-PASTE GUIDE)
*Gunakan urutan prompt berikut pada AI Agent pilihan Anda:*

**Tahap 1: Setup & UI Dasar (Untuk Lovable/Cursor)**
> "Baca PRD ini. Inisialisasi project React + Vite + Tailwind CSS. Buat layout utama mobile-first dengan Bottom Navigation yang memuat 4 tab: Home, Practice, Record, Profile. Gunakan palet warna --primary-navy #0A192F dan --brand-cyan #00A3FF. Buat dummy layar Home dengan gaya Bento Grid sesuai spesifikasi."

**Tahap 2: Database & Backend (Untuk Claude/Cursor)**
> "Berdasarkan skema database pada bagian 3 di PRD, buatkan kode SQL untuk Supabase. Setup RLS (Row Level Security) agar pengguna hanya bisa melihat data mereka sendiri. Buatkan Supabase client di dalam project React."

**Tahap 3: Logika Perekaman (Fokus Fitur Utama)**
> "Implementasikan halaman Recording Studio (Screen 3) menggunakan MediaRecorder API. Buat visualizer suara. Beri batasan waktu maksimal 5 menit (300 detik) yang akan auto-stop. Tambahkan fungsi upload blob audio tersebut ke Supabase Storage."