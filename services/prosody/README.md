# Speaking Pro — Prosody Service

Microservice Python (FastAPI + librosa) yang menghitung fitur prosodi dari
rekaman suara: `pitch_mean`, `pitch_variance`, `pause_ratio`, `wpm`
(estimasi laju suku kata), `energy_variance`. Skor intonasi 0-100
dihitung di sisi Next.js (`lib/prosody/client.ts`).

## Jalankan lokal

```bash
cd services/prosody
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# butuh ffmpeg di PATH (sudo apt install ffmpeg)
PROSODY_SERVICE_SECRET=rahasia uvicorn main:app --reload --port 8000
```

Tes:

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Authorization: Bearer rahasia" \
  -F "file=@sample.webm"
```

## Deploy (Fly.io / Render / Railway)

Container-ready via `Dockerfile`. Setelah deploy, isi di `.env.local`
aplikasi Next.js:

```
PROSODY_SERVICE_URL=https://<host-anda>
PROSODY_SERVICE_SECRET=<secret yang sama>
```

Jika `PROSODY_SERVICE_URL` kosong, `lib/prosody/client.ts` otomatis
memakai skor fixture sehingga pipeline analisis tetap berjalan.
