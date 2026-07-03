"""Speaking Pro prosody microservice.

POST /analyze  (multipart file field: "file")
  -> {pitch_mean, pitch_variance, pause_ratio, wpm, energy_variance}

Auth: optional Bearer token, set PROSODY_SERVICE_SECRET to enforce.
Accepts webm/opus, mp4/aac, wav -- anything ffmpeg can decode.
"""

import io
import os
import subprocess
import tempfile

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from analyze import extract_features

app = FastAPI(title="Speaking Pro Prosody Service", version="1.0.0")

SECRET = os.environ.get("PROSODY_SERVICE_SECRET", "")


def check_auth(authorization: str | None) -> None:
    if not SECRET:
        return
    if authorization != f"Bearer {SECRET}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def decode_audio(data: bytes) -> tuple[np.ndarray, int]:
    """Decode arbitrary container to mono float32 PCM via ffmpeg."""
    with tempfile.NamedTemporaryFile(suffix=".bin") as src:
        src.write(data)
        src.flush()
        proc = subprocess.run(
            [
                "ffmpeg", "-hide_banner", "-loglevel", "error",
                "-i", src.name,
                "-ac", "1", "-ar", "16000",
                "-f", "wav", "pipe:1",
            ],
            capture_output=True,
            timeout=120,
        )
    if proc.returncode != 0:
        raise HTTPException(
            status_code=422,
            detail=f"Decode gagal: {proc.stderr.decode(errors='ignore')[:200]}",
        )
    y, sr = sf.read(io.BytesIO(proc.stdout), dtype="float32")
    if y.ndim > 1:
        y = y.mean(axis=1)
    return y, sr


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
):
    check_auth(authorization)
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="File kosong")
    if len(data) > 30 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File terlalu besar")

    y, sr = decode_audio(data)
    try:
        return extract_features(y, sr)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
