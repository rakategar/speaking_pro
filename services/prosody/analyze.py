"""Prosody feature extraction for Speaking Pro.

Computes the five features consumed by lib/prosody/client.ts:
pitch_mean, pitch_variance, pause_ratio, wpm (syllable-rate estimate),
energy_variance. All numbers are plain floats so they serialize cleanly.
"""

from __future__ import annotations

import numpy as np
import librosa

SR = 16_000
FRAME_LENGTH = 2048
HOP_LENGTH = 512


def extract_features(y: np.ndarray, sr: int) -> dict:
    if sr != SR:
        y = librosa.resample(y, orig_sr=sr, target_sr=SR)
        sr = SR
    duration = len(y) / sr
    if duration < 0.5:
        raise ValueError("Audio terlalu pendek untuk dianalisis")

    # --- Pitch (F0) via pYIN, restricted to the speech range ---
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),   # ~65 Hz
        fmax=librosa.note_to_hz("C6"),   # ~1046 Hz
        sr=sr,
        frame_length=FRAME_LENGTH,
        hop_length=HOP_LENGTH,
    )
    voiced_f0 = f0[np.isfinite(f0)]
    pitch_mean = float(np.mean(voiced_f0)) if voiced_f0.size else 0.0
    pitch_variance = float(np.var(voiced_f0)) if voiced_f0.size else 0.0

    # --- Energy / pauses via RMS ---
    rms = librosa.feature.rms(
        y=y, frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH
    )[0]
    # Silence threshold relative to the median speech energy.
    threshold = max(np.median(rms) * 0.3, 1e-4)
    silent = rms < threshold
    pause_ratio = float(np.mean(silent))

    # Normalized energy variance (0..~1): variance of min-max scaled RMS.
    if rms.max() > rms.min():
        rms_norm = (rms - rms.min()) / (rms.max() - rms.min())
        energy_variance = float(np.var(rms_norm) * 4)  # scale toward 0..1
    else:
        energy_variance = 0.0

    # --- Speaking rate: syllable-nuclei estimate from energy peaks ---
    # Peaks in the smoothed RMS during voiced segments approximate
    # syllable nuclei; Indonesian averages ~2 syllables/word.
    from scipy.signal import find_peaks

    smoothed = np.convolve(rms, np.hanning(5) / np.hanning(5).sum(), "same")
    peaks, _ = find_peaks(
        smoothed, height=threshold * 1.5, distance=int(0.12 * sr / HOP_LENGTH)
    )
    syllables = int(len(peaks))
    words = syllables / 2.0
    speech_duration = duration * (1 - pause_ratio)
    wpm = float(words / (speech_duration / 60)) if speech_duration > 1 else 0.0

    return {
        "pitch_mean": round(pitch_mean, 2),
        "pitch_variance": round(pitch_variance, 2),
        "pause_ratio": round(pause_ratio, 4),
        "wpm": round(min(wpm, 400), 1),
        "energy_variance": round(min(energy_variance, 1.0), 4),
    }
