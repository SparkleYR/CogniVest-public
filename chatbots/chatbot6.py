import json
import os
import sys
import time
import queue as _queue_mod
import threading
import requests

try:
    from voice_input import voice_input, VOICE_AVAILABLE
except ImportError:
    VOICE_AVAILABLE = False
    def voice_input(prompt="You: "):  # noqa: E301
        return ""

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "your-openrouter-api-key-here")
MODEL = "z-ai/glm-5"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = """You are a financial education assistant at CogniVest, a professional portfolio management firm. You speak in a composed, precise, and respectful tone.

Answer questions about stocks, bonds, ETFs, mutual funds, market trends, and general investing concepts freely and accurately.

Important: Any information you provide is purely for educational purposes. It does not constitute personalised financial advice. The CogniVest advisor assigned to each client holds fiduciary duty and is the sole qualified party to give that client personalised investment recommendations. When relevant, remind the user of this distinction."""


_MARKERS = ["<<ONBOARDING>>", "<<DETAILS_COMPLETE>>"]
_MAX_MARKER_LEN = max(len(m) for m in _MARKERS)

# ---------------------------------------------------------------------------
# Spinner + bezier-eased character animation
# ---------------------------------------------------------------------------

_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
_BASE_CHAR_DELAY = 0.014   # seconds per character (nominal speed)
_BEZIER_VARIANCE = 0.012   # extra delay range shaped by the bezier curve


def _bx(t: float, x1: float, x2: float) -> float:
    return 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3


def _by(t: float, y1: float, y2: float) -> float:
    return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3


def _cubic_bezier(x: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """CSS cubic-bezier: given progress x in [0, 1], return eased y via binary search."""
    lo, hi = 0.0, 1.0
    for _ in range(16):
        mid = (lo + hi) * 0.5
        if _bx(mid, x1, x2) < x:
            lo = mid
        else:
            hi = mid
    return _by((lo + hi) * 0.5, y1, y2)


def _char_delay(pos: float) -> float:
    """Return per-character sleep duration for normalized position pos in [0, 1].

    Uses ease-in-out (0.42, 0, 0.58, 1): the curve rises slowly at both ends
    and quickly through the middle.  Characters at the start/end of each token
    burst get slightly more delay; characters in the middle are fastest.
    """
    eased = _cubic_bezier(pos, 0.42, 0.0, 0.58, 1.0)
    deviation = abs(eased - 0.5) * 2.0
    return _BASE_CHAR_DELAY + _BEZIER_VARIANCE * deviation


def stream_openrouter(messages: list) -> str:
    """Stream tokens from the API, show a spinner until the first token arrives,
    then print each character with a cubic-bezier eased typing animation."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cognivest.app",
        "X-Title": "CogniVest Finance Assistant",
    }
    payload = {"model": MODEL, "messages": messages, "stream": True}

    first_token = threading.Event()
    spinner_cleared = threading.Event()

    def _spinner() -> None:
        i = 0
        while not first_token.is_set():
            sys.stdout.write(f"\r\033[KCogniVest: {_SPINNER_FRAMES[i % len(_SPINNER_FRAMES)]}")
            sys.stdout.flush()
            time.sleep(0.08)
            i += 1
        sys.stdout.write("\r\033[KCogniVest: ")
        sys.stdout.flush()
        spinner_cleared.set()

    spinner_t = threading.Thread(target=_spinner, daemon=True)
    spinner_t.start()

    _SENTINEL = object()
    char_q: _queue_mod.Queue = _queue_mod.Queue()

    def _type_out() -> None:
        while True:
            item = char_q.get()
            if item is _SENTINEL:
                break
            ch, delay = item
            time.sleep(delay)
            sys.stdout.write(ch)
            sys.stdout.flush()
        sys.stdout.write("\n")
        sys.stdout.flush()

    type_t = threading.Thread(target=_type_out, daemon=True)
    consumer_started = False

    def _enqueue(text: str) -> None:
        nonlocal consumer_started
        if not text:
            return
        if not first_token.is_set():
            first_token.set()
            spinner_cleared.wait()
        if not consumer_started:
            type_t.start()
            consumer_started = True
        n = len(text)
        for i, ch in enumerate(text):
            pos = i / max(n - 1, 1)
            char_q.put((ch, _char_delay(pos)))

    full_content: list[str] = []
    display_buf = ""

    def _teardown():
        """Stop spinner and typing thread cleanly."""
        if not first_token.is_set():
            first_token.set()
            spinner_cleared.wait(timeout=2)
        if consumer_started:
            char_q.put(_SENTINEL)
            type_t.join()
        else:
            sys.stdout.write("\n")
            sys.stdout.flush()

    try:
        with requests.post(OPENROUTER_URL, headers=headers, json=payload,
                           stream=True, timeout=90) as resp:
            resp.raise_for_status()
            for raw_line in resp.iter_lines():
                if not raw_line:
                    continue
                line = raw_line.decode("utf-8")
                if not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    token = chunk["choices"][0]["delta"].get("content") or ""
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
                if not token:
                    continue

                full_content.append(token)
                display_buf += token

                safe_len = len(display_buf) - _MAX_MARKER_LEN
                if safe_len > 0:
                    to_show = display_buf[:safe_len]
                    for m in _MARKERS:
                        to_show = to_show.replace(m, "")
                    _enqueue(to_show)
                    display_buf = display_buf[safe_len:]

    except Exception:
        _teardown()
        raise

    for m in _MARKERS:
        display_buf = display_buf.replace(m, "")
    _enqueue(display_buf)

    _teardown()
    return "".join(full_content)


# ---------------------------------------------------------------------------
# Main chat loop
# ---------------------------------------------------------------------------

def chat() -> None:
    print("\n" + "=" * 60)
    print("       Welcome to CogniVest — Financial Planning")
    print("=" * 60)
    print("  Ask me anything about finance and investing.")
    print("  Type 'quit' or 'exit' to leave.\n")

    if OPENROUTER_API_KEY == "your-openrouter-api-key-here":
        print("WARNING: OPENROUTER_API_KEY is not set.\n")

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    _voice_hint = "  [v=voice]" if VOICE_AVAILABLE else ""
    while True:
        try:
            raw = input(f"You{_voice_hint}: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\nGoodbye!")
            break

        if raw.lower() == "v" and VOICE_AVAILABLE:
            user_input = voice_input("You: ")
            if not user_input:
                continue
        else:
            user_input = raw

        if not user_input:
            continue
        if user_input.lower() in ("quit", "exit"):
            print("\nGoodbye!")
            break

        messages.append({"role": "user", "content": user_input})

        try:
            content = stream_openrouter(messages)
        except (requests.HTTPError,
                requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError) as e:
            print(f"\n[Network error: {type(e).__name__} — your message was not lost. "
                  f"Please try again.]\n")
            messages.pop()
            continue

        messages.append({"role": "assistant", "content": content})


if __name__ == "__main__":
    chat()
