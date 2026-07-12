"""Speaking Pro prosody microservice.

POST /analyze  (multipart file field: "file")
  -> {pitch_mean, pitch_variance, pause_ratio, wpm, energy_variance}

Design notes:
- The heavy work (ffmpeg decode + librosa.pyin) is CPU-bound and blocking, so
  it runs in a worker thread via run_in_threadpool -- the asyncio event loop
  stays free to accept connections and answer /healthz while it runs.
- A per-process semaphore (PROSODY_MAX_CONCURRENCY, default 1) serializes
  the heavy work so it doesn't oversubscribe the host's cores.
- OMP/OPENBLAS/NUMBA are capped to 1 thread each (set before numpy/librosa
  import, at the top of this file) for the same reason.
- Deploy with a single uvicorn worker (no --workers flag). uvicorn's own
  multi-worker supervisor health-checks children over a ping/pong with a
  hardcoded 5s timeout and SIGKILLs anything that misses it -- a full GC
  pass over the object graph numba/llvmlite JIT compilation creates can
  stall the interpreter past 5s with nothing to log, which silently
  crash-loops the service. Single-worker mode never spawns that supervisor,
  so this failure mode can't occur. Scale by running independent
  single-worker instances behind a load balancer, not --workers.
- A numba JIT warmup at startup removes the ~50s first-request compile stall.

Auth: optional Bearer token, set PROSODY_SERVICE_SECRET to enforce.
Accepts webm/opus, mp4/aac, wav -- anything ffmpeg can decode.
"""

import os

# Must run before numpy/scipy/librosa/numba are imported -- those libraries
# read these env vars once at import/first-use to size their internal thread
# pools. Without this, each of the PROSODY workers spins up a full
# nproc-sized BLAS/numba thread pool, oversubscribing the host's cores badly
# enough that uvicorn's own liveness ping (5s timeout) starves and the
# supervisor SIGKILLs the "hung" worker mid-request -- a silent crash loop
# with no traceback. Keep each worker to one compute thread; total
# parallelism = workers x this.
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("NUMBA_NUM_THREADS", "1")

import asyncio
import io
import subprocess
import tempfile

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from starlette.concurrency import run_in_threadpool

from analyze import extract_features

app = FastAPI(title="Speaking Pro Prosody Service", version="1.1.0")

SECRET = os.environ.get("PROSODY_SERVICE_SECRET", "")
MAX_CONCURRENCY = max(1, int(os.environ.get("PROSODY_MAX_CONCURRENCY", "1")))
_sem = asyncio.Semaphore(MAX_CONCURRENCY)


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


def process_audio(data: bytes) -> dict:
    """Blocking pipeline (decode + feature extraction). Runs in a thread."""
    y, sr = decode_audio(data)
    return extract_features(y, sr)


@app.on_event("startup")
async def _warmup() -> None:
    """Compile librosa/numba kernels now so the first real request is fast."""
    try:
        sr = 16_000
        t = np.linspace(0, 1.0, sr, endpoint=False, dtype=np.float32)
        y = (0.5 * np.sin(2 * np.pi * 150 * t)).astype(np.float32)
        await run_in_threadpool(extract_features, y, sr)
        print(f"[prosody] warmup complete (pid={os.getpid()}, jit compiled)", flush=True)
    except Exception as e:  # never block startup on warmup
        print(f"[prosody] warmup skipped: {e}", flush=True)


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

    async with _sem:
        try:
            return await run_in_threadpool(process_audio, data)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
