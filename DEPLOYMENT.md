# Speaking Pro — Deployment Notes (VPS self-host)

Deployed 2026-07-03. Isolated from BTN/HANA/score (see `/opt/PAUSED_PROJECTS.md`).

## Akses
- **Publik (utama):** **https://faisalmaulana.site** (+ www) — HTTPS Let's Encrypt, auto-renew.
  Semua HTTP di-redirect ke HTTPS. **Fitur rekam suara AKTIF** (secure-context terpenuhi).
- Domain: A record `@` + CNAME `www` → `31.97.107.224` (registrar Domainesia, NS domainesia.net).
- Cert: `/etc/letsencrypt/live/faisalmaulana.site/` (certbot --nginx, renew via systemd timer).
- Akses lama `http://31.97.107.224:8092` sudah **dipensiunkan** (site nginx `speaking-pro`
  di-disable). App di-build untuk origin `https://faisalmaulana.site`.

## Login / Auth
- Halaman `/login` sudah **dimodifikasi dari repo asli**: tombol *Send Magic Link* &
  *Forgot Password* dihapus, diganti mode **Daftar** (email+password, akun langsung aktif).
- Alasan: Supabase lokal **tidak punya SMTP** → semua email (magic link, reset password,
  konfirmasi) tidak akan pernah terkirim. `enable_confirmations=false` di config.toml
  sehingga signup password langsung mendapat session.
- Jika nanti ingin magic link / reset password berfungsi: isi `[auth.email.smtp]` di
  `supabase/config.toml` dengan kredensial SMTP asli (mis. Gmail app-password, Brevo, Resend),
  `supabase stop && supabase start`, lalu kembalikan tombolnya di `app/(auth)/login/page.tsx`.

## Arsitektur & port (semua terpisah dari project lain)
| Komponen | Port | Dikelola oleh |
|---|---|---|
| nginx publik | **80/443** | site `faisalmaulana` (faisalmaulana.site, SSL) |
| Next.js (next start) | 127.0.0.1:**3300** | `speaking-pro-web.service` |
| Prosody FastAPI (uvicorn) | 127.0.0.1:**8100** | `speaking-pro-prosody.service` |
| Supabase kong/API | **54361** | Supabase CLI (project_id `speaking_pro`) |
| Supabase Postgres | **54362** | idem (shadow 54360) |

nginx `:8092` mem-proxy: `/auth/v1/ /rest/v1/ /storage/v1/` → kong 54361; sisanya (`/`, `/api/*`,
`/auth/callback`) → Next.js 3300. Browser & server pakai origin sama → tanpa masalah CORS.

## Supabase lokal (minimal)
- Aktif: db, auth (GoTrue), rest (PostgREST), storage, kong. **Nonaktif**: studio, realtime,
  edge_runtime, inbucket, analytics, storage.vector (hemat RAM). Konfigurasi di `supabase/config.toml`.
- Skema + seed: `supabase/migrations/20260703000000_init.sql`, `supabase/seed.sql`
  (9 tabel, trigger auto-profil `on_auth_user_created`, RLS per-user, GRANT role anon/authenticated,
  bucket privat `recordings`, seed 4 modul + 4 produk + 1 coach).
- Perintah (WAJIB set binary shim dulu):
  ```bash
  export SUPABASE_GO_BINARY=/root/.local/share/supabase/supabase-go
  cd /opt/speaking_pro
  supabase status        # lihat URL/keys
  supabase stop          # pause supabase (data volume tetap)
  supabase start         # resume
  supabase db reset      # re-apply migration + seed (menghapus data!)
  ```
  > Catatan: `supabase` di `/usr/local/bin` adalah shim yang butuh env `SUPABASE_GO_BINARY`
  > menunjuk ke `/root/.local/share/supabase/supabase-go`, kalau tidak → error "Could not find supabase-go".

## Kunci & environment (`/opt/speaking_pro/.env.local`, chmod 600)
- `NEXT_PUBLIC_SUPABASE_URL=https://faisalmaulana.site`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…`
- `SUPABASE_SERVICE_ROLE_KEY=sb_secret_…`  (format kunci baru; `sb_secret` = service role)
- `HF_TOKEN=hf_…`  (Hugging Face — kini hanya **fallback ASR** `whisper-large-v3` bila Gemini
  gagal. Token akun `raka tegar`, prepaid; kuotanya sudah habis 2026-07-03.)
- `GEMINI_API_KEY=AQ.…` + `GEMINI_MODEL=gemini-3.1-flash-lite` — **seluruh AI pindah ke Gemini**:
  LLM scoring (`lib/gemini/scoring-llm.ts`, sejak 2026-07-03) dan **ASR audio→teks langsung**
  (`lib/gemini/asr.ts`, sejak 2026-07-04; `maxOutputTokens` 8192 utk menahan loop repetisi
  pada audio repetitif). Keduanya retry 429/5xx dgn backoff via `lib/gemini/retry.ts`
  (maks 4 percobaan, hormati `retryDelay`). ASR ±2-6 dtk (rekaman ≤1 mnt) / ±22 dtk (10 mnt);
  scoring ±2 dtk. Batas utama kini = kuota free-tier per-menit Gemini (2 panggilan/analisis).
- `PROSODY_SERVICE_URL=http://127.0.0.1:8100`, `PROSODY_SERVICE_SECRET=…` (juga di unit prosody)
- `NEXT_PUBLIC_*` di-inline saat **build**, jadi ubah nilai → wajib `npm run build` ulang.

## Dashboard /analyst & Load Test
- **https://faisalmaulana.site/analyst** — password `viboxs` (cookie 12 jam). Menampilkan:
  CPU load/RAM/swap/disk, status service+container, log journalctl (web/prosody/system),
  dan statistik durasi pipeline analisis per tahap (prosody/ASR/LLM/total; avg/p50/p95).
- Sumber data durasi: tabel `analysis_metrics` (migrasi `20260704000000`), diisi otomatis
  oleh route analyze (instrumentasi di `app/api/recordings/[id]/analyze/route.ts`).
- Load test: `cd /opt/speaking_pro/loadtest && node loadtest.mjs prosody 15` (service intonasi
  langsung) atau `node loadtest.mjs e2e N [long]` (N user: signup→upload→analisis penuh;
  `long` = campuran rekaman 5/7,5/10 mnt; user test otomatis bernama loadtestN@speaking.local —
  hapus setelahnya). Jika koneksi analyze putus di ±300 dtk (headersTimeout fetch), loadtest
  otomatis polling status rekaman — server tetap memproses sampai selesai.
- **Catatan teknis penting** (2026-07-04): fetch Node/undici memutus respons tanpa header di
  ±300 dtk (headersTimeout) MESKI AbortSignal lebih panjang. Karena prosody baru mengirim
  header setelah selesai, klien prosody memakai **node:http murni** (`lib/prosody/client.ts`,
  timeout 540 dtk, di bawah nginx 600 dtk). Browser juga punya batas serupa (±300 dtk) —
  utk rekaman >5 mnt di beban tinggi, UI perlu polling status (belum diimplement di frontend).
- **Hasil stress test 2026-07-04** (@1 vCPU, semua AI via Gemini):
  | Skenario | Sukses | Wall time | Keterangan |
  |---|---|---|---|
  | 15 user, rekaman 31 dtk | 15/15 | 84 dtk | p95 ±84 dtk |
  | 25 user, rekaman 31 dtk | 23/25 (92%) | 131 dtk | 2 gagal 429 Gemini (kuota/menit) |
  | 40 user, rekaman 31 dtk | 29/40 (72%) | 189 dtk | 11 gagal kuota Gemini (ASR+scoring) |
  | 15 user, rekaman 5-10 mnt | **15/15** | 534 dtk | ASR Gemini 100%; ekor antrian prosody 521 dtk |
  Bottleneck: (1) kuota per-menit Gemini free tier — muncul ≥25 input bersamaan;
  (2) antrian serial prosody 1 vCPU ±0,07 dtk-CPU per dtk-audio — menentukan ekor latensi
  rekaman panjang. Infra lokal (RAM/web/db/storage) stabil di semua skenario.
- **Rekomendasi kapasitas**: input analisis bersamaan optimal **10-15** (rekaman ≤1 mnt,
  sukses 100%, hasil <1,5 mnt); maksimum **±25** (92%, p95 ±2 mnt). Rekaman 5-10 mnt:
  optimal **5-8** bersamaan, maksimum **15** (semua sukses tapi ekor ±9 mnt). Throughput
  berkelanjutan ±15 analisis/menit (dibatasi kuota Gemini). Estimasi user aktif (1 rekaman
  pendek per ±10 mnt/user): nyaman ±75-100, puncak ±150.

## Operasional
```bash
# status / restart
systemctl status speaking-pro-web speaking-pro-prosody
systemctl restart speaking-pro-web
journalctl -u speaking-pro-web -n 100 --no-pager

# redeploy setelah git pull / ganti env:
cd /opt/speaking_pro && git pull && npm install && npm run build \
  && systemctl restart speaking-pro-web

# nginx:
nginx -t && systemctl reload nginx
```

## Stop total / start total (mis. saat resume project lain butuh RAM)
```bash
# stop
systemctl stop speaking-pro-web speaking-pro-prosody
export SUPABASE_GO_BINARY=/root/.local/share/supabase/supabase-go
cd /opt/speaking_pro && supabase stop
# start
supabase start
systemctl start speaking-pro-prosody speaking-pro-web
```
