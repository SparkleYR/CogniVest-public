"""
voice_input.py — Whisper real-time voice transcription for CogniVest.

Install deps:
    uv pip install sounddevice faster-whisper

Usage:
    from voice_input import voice_input, VOICE_AVAILABLE
    if VOICE_AVAILABLE:
        text = voice_input("You: ")
"""

import sys
import time
import math
import threading
import numpy as np

try:
    import sounddevice as sd
    _SD_AVAILABLE = True
except ImportError:
    _SD_AVAILABLE = False

try:
    from faster_whisper import WhisperModel
    _WHISPER_AVAILABLE = True
except ImportError:
    _WHISPER_AVAILABLE = False

VOICE_AVAILABLE = _SD_AVAILABLE and _WHISPER_AVAILABLE

# ---------------------------------------------------------------------------
# Whisper model — lazy init on first use
# ---------------------------------------------------------------------------

_MODEL_SIZE    = "base"       # tiny/base/small/medium — base is fast + accurate
_MODEL_DEVICE  = "cpu"
_MODEL_COMPUTE = "int8"       # quantized for CPU speed
_whisper_model = None


def _get_model() -> "WhisperModel":
    global _whisper_model
    if _whisper_model is None:
        sys.stdout.write("  [Voice] Loading Whisper model (first use)...  ")
        sys.stdout.flush()
        _whisper_model = WhisperModel(
            _MODEL_SIZE,
            device=_MODEL_DEVICE,
            compute_type=_MODEL_COMPUTE,
        )
        sys.stdout.write("\r" + " " * 52 + "\r")
        sys.stdout.flush()
    return _whisper_model


# ---------------------------------------------------------------------------
# Recording config
# ---------------------------------------------------------------------------

SAMPLE_RATE   = 16000            # Hz — Whisper expects 16 kHz
CHUNK_SECS    = 0.1              # seconds per audio chunk
CHUNK_SAMPLES = int(SAMPLE_RATE * CHUNK_SECS)
SILENCE_THRESH = 0.015           # RMS below this = silence
SILENCE_SECS  = 1.5              # seconds of sustained silence before stop
MIN_SECS      = 0.4              # minimum recording before silence detection
MAX_SECS      = 30.0             # hard recording cap


# ---------------------------------------------------------------------------
# Spinner animation during recording / transcription
# ---------------------------------------------------------------------------

_SPIN_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]


def _run_spinner(stop: threading.Event, label: list) -> None:
    """Animate a spinner with a mutable label string."""
    i = 0
    while not stop.is_set():
        sys.stdout.write(f"\r  {_SPIN_FRAMES[i % len(_SPIN_FRAMES)]} {label[0]}  ")
        sys.stdout.flush()
        time.sleep(0.08)
        i += 1
    sys.stdout.write("\r" + " " * 54 + "\r")
    sys.stdout.flush()


# ---------------------------------------------------------------------------
# Microphone recording with silence detection
# ---------------------------------------------------------------------------

def _record() -> "np.ndarray":
    """Record audio from default mic until silence is detected."""
    chunks     = []
    silent_acc = 0.0
    total_sec  = 0.0

    with sd.InputStream(
        samplerate=SAMPLE_RATE,
        channels=1,
        dtype="float32",
        blocksize=CHUNK_SAMPLES,
    ) as stream:
        while True:
            buf, _ = stream.read(CHUNK_SAMPLES)
            chunks.append(buf.flatten().copy())
            total_sec += CHUNK_SECS
            rms = float(np.sqrt(np.mean(buf ** 2)))

            if total_sec >= MIN_SECS:
                if rms < SILENCE_THRESH:
                    silent_acc += CHUNK_SECS
                else:
                    silent_acc = 0.0
                if silent_acc >= SILENCE_SECS:
                    break
            if total_sec >= MAX_SECS:
                break

    return np.concatenate(chunks)


# ---------------------------------------------------------------------------
# Whisper transcription
# ---------------------------------------------------------------------------

def _transcribe(audio: "np.ndarray") -> str:
    """Run Whisper on a float32 16 kHz numpy array."""
    model = _get_model()
    segs, _ = model.transcribe(
        audio,
        language="en",
        beam_size=5,
        vad_filter=True,
        vad_parameters={"min_silence_duration_ms": 300},
    )
    return " ".join(s.text.strip() for s in segs).strip()


# ---------------------------------------------------------------------------
# Smooth character-by-character animation
# ---------------------------------------------------------------------------

def _animate_text(text: str, prompt: str) -> None:
    """Print text with ease-in-out character animation matching chatbot style."""
    sys.stdout.write(f"\r{prompt}")
    sys.stdout.flush()
    n = len(text)
    for i, ch in enumerate(text):
        sys.stdout.write(ch)
        sys.stdout.flush()
        # Sinusoidal ease-in-out: slow at edges (start/end), fast in the middle
        t     = i / max(n - 1, 1)
        ease  = math.sin(math.pi * t)          # 0 → 1 → 0
        delay = 0.032 - 0.018 * ease           # 32ms at edges, 14ms at centre
        time.sleep(delay)
    print()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def voice_input(prompt: str = "You: ") -> str:
    """Record from microphone, transcribe with Whisper, animate result.

    Shows a recording spinner, stops on ~1.5s of silence, runs Whisper,
    then prints the transcription with a smooth typing animation.

    Returns the transcribed text, or an empty string if nothing detected.
    """
    if not VOICE_AVAILABLE:
        missing = (["sounddevice"] if not _SD_AVAILABLE else []) + \
                  (["faster-whisper"] if not _WHISPER_AVAILABLE else [])
        print(f"\n  [Voice unavailable — run: uv pip install {' '.join(missing)}]\n")
        return ""

    stop   = threading.Event()
    label  = ["Recording... (pause when done)"]
    spin_t = threading.Thread(target=_run_spinner, args=(stop, label), daemon=True)
    spin_t.start()

    try:
        audio    = _record()
        label[0] = "Transcribing..."
        text     = _transcribe(audio)
    except Exception as exc:
        stop.set()
        spin_t.join()
        print(f"\n  [Voice error: {exc}]\n")
        return ""

    stop.set()
    spin_t.join()

    if not text:
        return ""

    _animate_text(text, prompt)
    return text
