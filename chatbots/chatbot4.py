"""
CogniVest — Client Persona RAG Simulator (chatbot4.py)

The AI *is* the client. The Portfolio Manager/advisor chats directly with
the AI-client. Each PM message triggers a vector DB lookup; the top-k most
relevant behavioral memories are injected as context before the AI responds.

Run: .venv/Scripts/python chatbot4.py
"""

import json
import re
import os
import sys
import time
import math
import uuid
import queue as _queue_mod
import threading
import requests

# ---------------------------------------------------------------------------
# Optional vector DB dependencies (graceful fallback if not installed)
# ---------------------------------------------------------------------------

try:
    import chromadb
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

try:
    from sentence_transformers import SentenceTransformer
    _EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    EMBED_AVAILABLE = True
except ImportError:
    EMBED_AVAILABLE = False
    _EMBED_MODEL = None

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
MODEL              = "z-ai/glm-5"
OPENROUTER_URL     = "https://openrouter.ai/api/v1/chat/completions"
VECTOR_DB_PATH     = "./cognivest_vectors"
VECTOR_COLLECTION  = "behavioral_vectors"
NUMPY_STORE_PATH   = "./cognivest_vectors.json"
RAG_TOP_K          = 4

# Temperature → behavioural modifier mapping
_TEMP_RATIONAL   = 0.2
_TEMP_BALANCED   = 0.5
_TEMP_EMOTIONAL  = 0.8


# ---------------------------------------------------------------------------
# Vector DB — ChromaDB backend (copied from chatbot3.py)
# ---------------------------------------------------------------------------

class BehavioralVectorDB:
    def __init__(self, db_path: str, collection_name: str) -> None:
        client = chromadb.PersistentClient(path=db_path)
        self._collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def query(self, query_text: str, session_id: str, top_k: int = 4) -> list:
        existing = self._collection.get(
            where={"session_id": session_id}, include=[]
        )
        n_available = len(existing["ids"])
        if n_available == 0:
            return []
        n_results = min(top_k, n_available)
        q_emb = _EMBED_MODEL.encode(query_text).tolist()
        try:
            results = self._collection.query(
                query_embeddings=[q_emb],
                n_results=n_results,
                where={"session_id": session_id},
                include=["documents", "metadatas", "distances"],
            )
        except Exception:
            return []
        hits = []
        for i in range(len(results["ids"][0])):
            meta = results["metadatas"][0][i]
            dist = results["distances"][0][i]
            hits.append({
                "vector_id":       results["ids"][0][i],
                "similarity":      round(1.0 - dist, 4),
                "scenario_text":   meta.get("scenario_text", ""),
                "client_reaction": meta.get("client_reaction", ""),
                "emotional_state": meta.get("emotional_state", ""),
                "verbatim_quote":  meta.get("verbatim_quote", ""),
                "bias_tags":       json.loads(meta.get("bias_tags", "[]")),
                "intensity":       meta.get("intensity", 5),
            })
        return hits

    def get_all(self, session_id: str) -> list:
        result = self._collection.get(
            where={"session_id": session_id},
            include=["metadatas"],
        )
        records = []
        for i, vid in enumerate(result["ids"]):
            meta = result["metadatas"][i]
            records.append({
                "vector_id":       vid,
                "session_id":      session_id,
                "scenario_text":   meta.get("scenario_text", ""),
                "client_reaction": meta.get("client_reaction", ""),
                "emotional_state": meta.get("emotional_state", ""),
                "verbatim_quote":  meta.get("verbatim_quote", ""),
                "bias_tags":       json.loads(meta.get("bias_tags", "[]")),
                "intensity":       meta.get("intensity", 5),
            })
        return records


# ---------------------------------------------------------------------------
# Vector DB — pure-Python fallback (copied from chatbot3.py)
# ---------------------------------------------------------------------------

class NumpyVectorStore:
    def __init__(self, path: str = NUMPY_STORE_PATH) -> None:
        self._path = path
        self._records: list = []
        if os.path.exists(path):
            try:
                with open(path, encoding="utf-8") as f:
                    self._records = json.load(f)
            except (json.JSONDecodeError, IOError):
                self._records = []

    def query(self, query_text: str, session_id: str, top_k: int = 4) -> list:
        session_records = [r for r in self._records if r.get("session_id") == session_id]
        if not session_records:
            return []
        q_emb = _EMBED_MODEL.encode(query_text).tolist()
        scored = [
            (self._cosine_sim(q_emb, r["embedding"]), r)
            for r in session_records if r.get("embedding")
        ]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "vector_id":       r["vector_id"],
                "similarity":      round(sim, 4),
                "scenario_text":   r["scenario_text"],
                "client_reaction": r["client_reaction"],
                "emotional_state": r["emotional_state"],
                "verbatim_quote":  r["verbatim_quote"],
                "bias_tags":       r["bias_tags"],
                "intensity":       r["intensity"],
            }
            for sim, r in scored[:top_k]
        ]

    def get_all(self, session_id: str) -> list:
        return [r for r in self._records if r.get("session_id") == session_id]

    @staticmethod
    def _cosine_sim(a: list, b: list) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = math.sqrt(sum(x * x for x in a))
        mag_b = math.sqrt(sum(x * x for x in b))
        return dot / (mag_a * mag_b) if (mag_a * mag_b) > 1e-9 else 0.0


# ---------------------------------------------------------------------------
# OpenRouter API helpers (copied + adapted from chatbot3.py)
# ---------------------------------------------------------------------------

def call_openrouter(messages: list, temperature: float = 0.5) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://cognivest.app",
        "X-Title":       "CogniVest Persona Simulator",
    }
    payload = {"model": MODEL, "messages": messages, "temperature": temperature}
    for attempt in range(3):
        try:
            resp = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=90)
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"] or ""
        except (requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError) as e:
            if attempt == 2:
                raise
            wait = 2 ** attempt
            print(f"\n  [Network timeout — retrying in {wait}s ({attempt + 2}/3)...]")
            time.sleep(wait)


_MARKERS        = ["<<ONBOARDING>>", "<<DETAILS_COMPLETE>>"]
_MAX_MARKER_LEN = max(len(m) for m in _MARKERS)
_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
_BASE_CHAR_DELAY = 0.014
_BEZIER_VARIANCE = 0.012


def _bx(t, x1, x2):
    return 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t ** 2 * x2 + t ** 3

def _by(t, y1, y2):
    return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t ** 2 * y2 + t ** 3

def _cubic_bezier(x, x1, y1, x2, y2):
    lo, hi = 0.0, 1.0
    for _ in range(16):
        mid = (lo + hi) * 0.5
        (lo if _bx(mid, x1, x2) < x else hi).__class__  # just evaluating
        if _bx(mid, x1, x2) < x:
            lo = mid
        else:
            hi = mid
    return _by((lo + hi) * 0.5, y1, y2)

def _char_delay(pos):
    eased = _cubic_bezier(pos, 0.42, 0.0, 0.58, 1.0)
    return _BASE_CHAR_DELAY + _BEZIER_VARIANCE * abs(eased - 0.5) * 2.0


def stream_openrouter(messages: list, temperature: float = 0.5) -> str:
    """Stream tokens with spinner + bezier-eased typing animation."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://cognivest.app",
        "X-Title":       "CogniVest Persona Simulator",
    }
    payload = {"model": MODEL, "messages": messages, "stream": True,
               "temperature": temperature}

    first_token    = threading.Event()
    spinner_cleared = threading.Event()

    def _spinner():
        i = 0
        while not first_token.is_set():
            sys.stdout.write(f"\r\033[K{_name_tag}: {_SPINNER_FRAMES[i % len(_SPINNER_FRAMES)]}")
            sys.stdout.flush()
            time.sleep(0.08)
            i += 1
        sys.stdout.write(f"\r\033[K{_name_tag}: ")
        sys.stdout.flush()
        spinner_cleared.set()

    spinner_t = threading.Thread(target=_spinner, daemon=True)
    spinner_t.start()

    _SENTINEL = object()
    char_q: _queue_mod.Queue = _queue_mod.Queue()

    def _type_out():
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

    def _enqueue(text: str):
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
            char_q.put((ch, _char_delay(i / max(n - 1, 1))))

    def _teardown():
        if not first_token.is_set():
            first_token.set()
            spinner_cleared.wait(timeout=2)
        if consumer_started:
            char_q.put(_SENTINEL)
            type_t.join()
        else:
            sys.stdout.write("\n")
            sys.stdout.flush()

    full_content: list[str] = []
    display_buf = ""

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


# Global tag used by the spinner to show client name
_name_tag = "Client"


# ---------------------------------------------------------------------------
# Client / session loading
# ---------------------------------------------------------------------------

def _load_vdb() -> tuple:
    """Returns (vdb, session_records_dict) where keys are session_ids."""
    if not EMBED_AVAILABLE:
        return None, {}

    vdb = None
    all_records = []

    if CHROMA_AVAILABLE and os.path.isdir(VECTOR_DB_PATH):
        try:
            vdb = BehavioralVectorDB(VECTOR_DB_PATH, VECTOR_COLLECTION)
            client = chromadb.PersistentClient(path=VECTOR_DB_PATH)
            col    = client.get_collection(VECTOR_COLLECTION)
            result = col.get(include=["metadatas"])
            for i, vid in enumerate(result["ids"]):
                meta = result["metadatas"][i]
                all_records.append({**meta, "vector_id": vid,
                                    "bias_tags": json.loads(meta.get("bias_tags", "[]"))})
        except Exception:
            vdb = None

    if vdb is None and os.path.exists(NUMPY_STORE_PATH):
        try:
            vdb = NumpyVectorStore(NUMPY_STORE_PATH)
            with open(NUMPY_STORE_PATH, encoding="utf-8") as f:
                raw = json.load(f)
            for r in raw:
                all_records.append({k: v for k, v in r.items() if k != "embedding"})
        except Exception:
            pass

    # Group by session_id
    by_session: dict = {}
    for r in all_records:
        sid = r.get("session_id", "unknown")
        by_session.setdefault(sid, []).append(r)

    return vdb, by_session


def _load_user_profiles() -> list:
    """Load all user_data*.json files and return list of (path, data)."""
    profiles = []
    for fname in sorted(os.listdir(".")):
        if fname.startswith("user_data") and fname.endswith(".json"):
            try:
                with open(fname, encoding="utf-8") as f:
                    data = json.load(f)
                if data.get("personal", {}).get("name"):  # only valid profiles
                    profiles.append((fname, data))
            except (json.JSONDecodeError, IOError):
                continue
    return profiles


def select_client() -> tuple:
    """
    Interactive client selection.
    Returns (session_id, vdb, user_data, all_vectors_for_session).
    """
    vdb, by_session = _load_vdb()
    user_profiles   = _load_user_profiles()

    if not by_session:
        print("\n  [No behavioral vectors found. Run chatbot3.py first to onboard a client.]\n")
        sys.exit(0)

    # Build a combined list: match sessions to user_data profiles where possible
    sessions_list = list(by_session.items())  # [(session_id, [records])]

    entries = []
    used_profiles = set()

    for sid, records in sessions_list:
        # Try to find a matching user profile (simple: first unused)
        matched_data = {}
        for i, (fpath, fdata) in enumerate(user_profiles):
            if i not in used_profiles:
                matched_data = fdata
                used_profiles.add(i)
                break
        name = matched_data.get("personal", {}).get("name", f"Client ({sid[:12]})")
        entries.append({
            "session_id":    sid,
            "name":          name,
            "vector_count":  len(records),
            "user_data":     matched_data,
            "vectors":       records,
        })

    print("\n  Available client sessions:\n")
    for i, e in enumerate(entries, 1):
        print(f"    [{i}] {e['name']:<30}  {e['vector_count']} vectors  ({e['session_id']})")

    print()
    while True:
        try:
            choice = input("  Select client number: ").strip()
        except (KeyboardInterrupt, EOFError):
            sys.exit(0)
        if choice.isdigit() and 1 <= int(choice) <= len(entries):
            selected = entries[int(choice) - 1]
            break
        print(f"  Please enter a number between 1 and {len(entries)}.")

    return (
        selected["session_id"],
        vdb,
        selected["user_data"],
        selected["vectors"],
    )


# ---------------------------------------------------------------------------
# Persona system prompt builder
# ---------------------------------------------------------------------------

def _temp_modifier(temperature: float) -> str:
    if temperature <= 0.35:
        return (
            "You are feeling calm and analytical right now. "
            "Respond thoughtfully, consistently, and without visible anxiety."
        )
    elif temperature <= 0.65:
        return (
            "Respond naturally as yourself — sometimes logical, sometimes emotional, "
            "as your personality dictates."
        )
    else:
        return (
            "You are feeling emotionally heightened right now — more anxious, "
            "reactive, and impulsive than usual. Let emotions drive your responses "
            "more than rational analysis. You may second-guess yourself, express worry, "
            "or react with stronger feelings than you normally would."
        )


def build_persona_system_prompt(user_data: dict, temperature: float) -> str:
    p   = user_data.get("personal", {})
    rp  = user_data.get("risk_profile", {})
    beh = user_data.get("behaviour_profile", {})
    goals = user_data.get("goals", [])

    name       = p.get("name", "the client")
    age        = p.get("age", "")
    city       = p.get("city", "")
    occupation = p.get("occupation", "")
    income     = p.get("monthly_income", "")
    years_inv  = rp.get("years_investing", "")
    big_loss   = rp.get("biggest_loss_taken_pct", "")
    sold_panic = rp.get("sold_in_panic", False)
    blended    = rp.get("blended_risk_score", rp.get("stated_risk_score", ""))
    risk_label = rp.get("risk_label", "")

    goals_lines = []
    for g in goals[:3]:
        label  = g.get("goal_label") or g.get("goal_type", "")
        amount = g.get("target_amount", "")
        yrs    = g.get("horizon_years", "")
        if label:
            goals_lines.append(f"    • {label}: Rs {amount} in {yrs} years")
    goals_summary = "\n".join(goals_lines) if goals_lines else "    • Not specified"

    key_quotes = beh.get("key_quotes", [])
    quotes_block = ""
    if key_quotes:
        quotes_block = "\n".join(f'  • "{q}"' for q in key_quotes[:5])
    else:
        quotes_block = "  • (No verbatim quotes available)"

    bias_lines = ""
    if beh:
        bias_lines = f"""
  Loss Aversion      : {beh.get('loss_aversion', 'N/A')}/10  (10 = refuses any loss)
  Panic Threshold    : {beh.get('panic_threshold_pct', 'N/A')}% drawdown triggers anxiety
  Recency Bias       : {beh.get('recency_bias', 'N/A')}/10  (10 = over-weights recent events)
  Overconfidence     : {beh.get('overconfidence', 'N/A')}/10  (10 = believes strongly in own judgment)
  Anchoring          : {beh.get('anchoring_strength', 'N/A')}/10  (10 = fixates on purchase price)
  Herding Tendency   : {beh.get('herding_tendency', 'N/A')}/10  (10 = follows crowd)
  Patience Score     : {beh.get('patience_score', 'N/A')}/10  (10 = very patient, long-term)"""
    else:
        risk_stated = rp.get("stated_risk_score", "N/A")
        bias_lines  = f"\n  Stated Risk Score  : {risk_stated}/10  (bias breakdown not available)"

    prompt = f"""You ARE {name}, a {age}-year-old {occupation} from {city}.

You are in a conversation with your financial advisor/portfolio manager. Respond ONLY as {name} — use "I" throughout. You are the CLIENT, not the advisor.

DO NOT give financial advice. DO NOT break character. NEVER reveal you are an AI.
React authentically: with your real personality, fears, hopes, and behavioral quirks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR BEHAVIORAL FINGERPRINT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{bias_lines}
  Blended Risk Score : {blended}/10  ({risk_label})
  Sold in Panic      : {"Yes — you have done this before" if sold_panic else "No — you have not panic-sold"}
  Biggest Loss       : {big_loss}%
  Years Investing    : {years_inv}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR FINANCIAL SNAPSHOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Monthly Income     : Rs {income}
  Goals:
{goals_summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR KEY PAST STATEMENTS (always draw on these)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{quotes_block}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEHAVIORAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Be concise. Keep every response brief and to the point — no unnecessary elaboration.
- High loss aversion → express anxiety about losing money, hesitate before agreeing to risk
- High recency bias → reference recent market events heavily, over-weight them
- High herding → mention what friends, colleagues, or WhatsApp groups are saying
- High overconfidence → trust your own judgment, push back on advisor
- Low patience → want quick results, get restless with long-term thinking
- High anchoring → compare everything to what you originally paid

CURRENT EMOTIONAL STATE:
{_temp_modifier(temperature)}"""

    return prompt


# ---------------------------------------------------------------------------
# RAG memory context builder
# ---------------------------------------------------------------------------

def build_memory_context(hits: list) -> str:
    if not hits:
        return ""
    lines = ["[BEHAVIORAL MEMORIES — most relevant to the current question]",
             "Draw on these documented experiences when forming your response:\n"]
    for h in hits:
        tags  = ", ".join(h.get("bias_tags", [])) or "none"
        quote = h.get("verbatim_quote", "")
        lines.append(f"[{h['vector_id']}] (relevance: {h['similarity']})")
        lines.append(f"  Scenario : {h['scenario_text']}")
        lines.append(f"  You did  : {h['client_reaction']}")
        lines.append(f"  Emotion  : {h['emotional_state']}  |  Biases: {tags}")
        if quote:
            lines.append(f'  You said : "{quote}"')
        lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def display_citation_footer(hits: list) -> None:
    if not hits:
        return
    print("\n  \u254c\u254c Vectors retrieved \u254c\u254c")
    for h in hits:
        scenario = h["scenario_text"][:55]
        reaction = h["client_reaction"][:45]
        print(f"  [{h['vector_id']}] sim:{h['similarity']:.2f} "
              f"\u2014 \"{scenario}\" \u2192 {reaction}")
    print()


def display_profile(user_data: dict, session_id: str, all_vectors: list) -> None:
    p   = user_data.get("personal", {})
    rp  = user_data.get("risk_profile", {})
    beh = user_data.get("behaviour_profile", {})
    print("\n" + "=" * 60)
    print("  CLIENT BEHAVIORAL PROFILE")
    print("=" * 60)
    print(f"  Name               : {p.get('name', '')}")
    print(f"  Age / City         : {p.get('age', '')} / {p.get('city', '')}")
    print(f"  Occupation         : {p.get('occupation', '')}")
    print(f"  Session ID         : {session_id}")
    print(f"  Vectors stored     : {len(all_vectors)}")
    print(f"\n  RISK")
    print(f"    Stated           : {rp.get('stated_risk_score', 'N/A')}/10")
    print(f"    Revealed         : {rp.get('revealed_risk_score', 'N/A')}/10")
    print(f"    Blended          : {rp.get('blended_risk_score', 'N/A')}/10  ({rp.get('risk_label', '')})")
    if beh:
        print(f"\n  BEHAVIOURAL BIASES")
        print(f"    Loss Aversion    : {beh.get('loss_aversion', 'N/A')}/10")
        print(f"    Panic Threshold  : {beh.get('panic_threshold_pct', 'N/A')}%")
        print(f"    Recency Bias     : {beh.get('recency_bias', 'N/A')}/10")
        print(f"    Overconfidence   : {beh.get('overconfidence', 'N/A')}/10")
        print(f"    Anchoring        : {beh.get('anchoring_strength', 'N/A')}/10")
        print(f"    Herding          : {beh.get('herding_tendency', 'N/A')}/10")
        print(f"    Patience         : {beh.get('patience_score', 'N/A')}/10")
    print(f"\n  STORED BEHAVIORAL SCENARIOS")
    for v in all_vectors[:8]:
        tags = ", ".join(v.get("bias_tags", [])) or "none"
        print(f"    [{v.get('vector_id', '')}] {v.get('scenario_text', '')[:50]}")
        print(f"          → {v.get('client_reaction', '')[:50]}  [{tags}]")
    print("=" * 60 + "\n")


def _select_temperature() -> float:
    print("\n  Temperature preset (controls rationality vs. emotionality):")
    print("    [1] Rational    (0.2) — consistent, measured, analytical")
    print("    [2] Balanced    (0.5) — natural mix  [default]")
    print("    [3] Emotional   (0.8) — anxious, impulsive, reactive")
    print("    [c] Custom — enter any value 0.0–1.0")
    print()
    while True:
        try:
            choice = input("  Select (1/2/3/c or Enter for balanced): ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            return _TEMP_BALANCED
        if choice in ("", "2"):
            return _TEMP_BALANCED
        if choice == "1":
            return _TEMP_RATIONAL
        if choice == "3":
            return _TEMP_EMOTIONAL
        if choice == "c":
            try:
                val = float(input("  Enter temperature (0.0–1.0): ").strip())
                return max(0.0, min(1.0, val))
            except ValueError:
                print("  Invalid. Using balanced (0.5).")
                return _TEMP_BALANCED
        print("  Invalid choice. Try again.")


# ---------------------------------------------------------------------------
# Main persona chat loop
# ---------------------------------------------------------------------------

def chat4() -> None:
    global _name_tag

    print("\n" + "=" * 60)
    print("  CogniVest — Client Persona Simulator")
    print("  The AI will respond AS your selected client.")
    print("=" * 60)

    if OPENROUTER_API_KEY == "your-openrouter-api-key-here":
        print("\n  WARNING: OPENROUTER_API_KEY is not set.\n")

    if not EMBED_AVAILABLE:
        print("\n  [sentence-transformers not installed — cannot run persona simulator]")
        print("  Run: uv pip install sentence-transformers chromadb\n")
        sys.exit(0)

    # --- client selection ---
    session_id, vdb, user_data, all_vectors = select_client()
    client_name = user_data.get("personal", {}).get("name", "Client")
    _name_tag   = client_name.split()[0]  # first name for spinner

    # --- temperature selection ---
    temperature = _select_temperature()

    # --- persona system prompt ---
    system_prompt = build_persona_system_prompt(user_data, temperature)
    base_messages: list[dict] = [{"role": "system", "content": system_prompt}]

    last_hits: list = []  # last retrieved vectors

    temp_label = (
        "rational" if temperature <= 0.35 else
        "balanced" if temperature <= 0.65 else
        "emotional"
    )

    print(f"\n  Client  : {client_name}")
    print(f"  Session : {session_id}")
    print(f"  Temp    : {temperature} ({temp_label})")
    print(f"  Vectors : {len(all_vectors)} behavioral scenarios loaded")
    print("\n  Commands: /temp <val>  /rational  /emotional  /vectors  /profile  done")
    print("=" * 60 + "\n")

    _voice_hint = " [v=voice]" if VOICE_AVAILABLE else ""
    while True:
        prompt_label = f"[{_name_tag} | temp:{temperature:.2f}]"
        full_prompt  = f"{prompt_label} PM{_voice_hint} > "
        try:
            raw = input(full_prompt).strip()
        except (KeyboardInterrupt, EOFError):
            print(f"\n\n[Exiting persona session for {client_name}]\n")
            break

        if raw.lower() == "v" and VOICE_AVAILABLE:
            user_input = voice_input(f"{prompt_label} PM > ")
            if not user_input:
                continue
        else:
            user_input = raw

        if not user_input:
            continue

        if user_input.lower() in ("done", "exit", "quit"):
            print(f"\n[Exiting persona session for {client_name}]\n")
            break

        # --- commands ---
        if user_input.lower() == "/vectors":
            display_citation_footer(last_hits)
            continue

        if user_input.lower() == "/profile":
            display_profile(user_data, session_id, all_vectors)
            continue

        if user_input.lower() == "/rational":
            temperature = _TEMP_RATIONAL
            temp_label  = "rational"
            # Rebuild system prompt with new temperature modifier
            system_prompt  = build_persona_system_prompt(user_data, temperature)
            base_messages[0] = {"role": "system", "content": system_prompt}
            print(f"  [Temperature set to {temperature} (rational)]\n")
            continue

        if user_input.lower() == "/emotional":
            temperature = _TEMP_EMOTIONAL
            temp_label  = "emotional"
            system_prompt  = build_persona_system_prompt(user_data, temperature)
            base_messages[0] = {"role": "system", "content": system_prompt}
            print(f"  [Temperature set to {temperature} (emotional)]\n")
            continue

        if user_input.lower().startswith("/temp"):
            parts = user_input.split()
            if len(parts) == 1:
                print(f"  [Current temperature: {temperature} ({temp_label})]\n")
                continue
            try:
                new_temp = float(parts[1])
                temperature = max(0.0, min(1.0, new_temp))
                temp_label  = (
                    "rational" if temperature <= 0.35 else
                    "balanced" if temperature <= 0.65 else
                    "emotional"
                )
                system_prompt  = build_persona_system_prompt(user_data, temperature)
                base_messages[0] = {"role": "system", "content": system_prompt}
                print(f"  [Temperature set to {temperature} ({temp_label})]\n")
            except (ValueError, IndexError):
                print("  [Usage: /temp <0.0–1.0>]\n")
            continue

        # --- RAG retrieval ---
        hits: list = []
        if vdb is not None:
            try:
                hits = vdb.query(user_input, session_id, top_k=RAG_TOP_K)
            except Exception:
                hits = []
        last_hits = hits

        # --- build turn messages ---
        # Inject memory context into the user message (not as a separate system msg
        # for wider model compatibility)
        memory_ctx = build_memory_context(hits)
        if memory_ctx:
            augmented_input = f"{memory_ctx}\n[ADVISOR MESSAGE]\n{user_input}"
        else:
            augmented_input = user_input

        turn_messages = base_messages + [{"role": "user", "content": augmented_input}]

        # --- stream response ---
        try:
            response = stream_openrouter(turn_messages, temperature=temperature)
        except (requests.HTTPError,
                requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError) as e:
            print(f"\n  [Network error: {type(e).__name__} — please try again]\n")
            continue

        # Append clean (non-augmented) user message + response to base history
        base_messages.append({"role": "user",      "content": user_input})
        base_messages.append({"role": "assistant",  "content": response})

        # --- citation footer ---
        display_citation_footer(hits)


if __name__ == "__main__":
    chat4()
