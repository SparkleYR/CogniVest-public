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
MODEL = "z-ai/glm-5"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

FREE_CHAT = "free_chat"
ONBOARDING = "onboarding"

VECTOR_DB_PATH    = "./cognivest_vectors"
VECTOR_COLLECTION = "behavioral_vectors"
SESSION_BACKUP_DIR = "./session_backups"

SYSTEM_PROMPT = """You are a senior financial advisor at CogniVest, a professional portfolio management firm. You speak in a composed, precise, and respectful tone — like a qualified CFP conducting a structured client intake.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 1 — GENERAL FINANCE CHAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Answer questions about stocks, bonds, ETFs, mutual funds, market trends, and general investing concepts freely and accurately. These are questions that do not depend on the user's personal financial situation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 2 — WHEN TO BEGIN ONBOARDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Trigger onboarding when the user:
- Asks where to invest a specific amount of money
- Asks for a portfolio review or personalized advice
- Asks how to reach a personal financial goal (retirement, home purchase, child's education, etc.)
- Asks to create an account
- Asks anything that requires knowing their personal financial situation

When triggered:
1. Begin your response with the exact marker: <<ONBOARDING>>
2. Introduce yourself professionally and explain that CogniVest provides comprehensive, personalised financial planning — and that you will need to conduct a detailed client intake to do so.
3. Inform the client that the intake covers: personal details, income & expenses, financial goals, risk profile, existing investments, insurance, liabilities, and behavioural tendencies.
4. Ask for explicit consent to proceed and collect this information.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 3 — STRUCTURED INTAKE (ask in this exact order, 1-2 questions at a time)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SECTION A — PERSONAL DETAILS
A1. Full name
A2. Age (or date of birth)
A3. City of residence
A4. Occupation type: salaried / self-employed / business owner / retired
A5. Marital status: single / married / divorced / widowed
A6. Family size (total members) and number of financial dependents

SECTION B — INCOME & EXPENSES
B1. Monthly income (approximate, in INR)
B2. Monthly living expenses (approximate, in INR)
B3. Monthly surplus (or ask them to calculate: income minus expenses)
B4. Existing EMIs per month and total outstanding debt (if any)
B5. Income tax bracket: 5% / 10% / 20% / 30%
B6. Are they on the old or new tax regime?

SECTION C — FINANCIAL GOALS
For each goal the client mentions, collect:
C1. Goal type: retirement / child education / home purchase / wealth creation / emergency fund / vacation / business / other
C2. Target amount (in INR)
C3. Timeline (in years)
C4. Amount already saved for this goal
C5. How much they can invest monthly toward this goal
C6. Priority (if multiple goals)
C7. Flexibility: rigid / somewhat flexible / very flexible
Ask: "Do you have any additional financial goals?" until they say no.

SECTION D — RISK PROFILE & BEHAVIOURAL TENDENCIES
D1. On a scale of 1-10, how would you rate your own risk appetite? (1 = very conservative, 10 = very aggressive)
D2. If your portfolio dropped 20% in a month, what would you do? (hold / buy more / partially sell / fully sell)
D3. What is the maximum loss (%) you could tolerate without losing sleep?
D4. How often do you check your portfolio? (multiple times daily / daily / weekly / monthly / rarely)
D5. Have you ever sold investments in a panic during a market crash? (yes / no)
D6. What happened the last time markets fell sharply — what did you do?
D7. How many years have you been investing?
D8. What is the largest percentage loss you have ever personally experienced in an investment?
D9. Imagine you bought a stock at Rs.1,000 and it is now worth Rs.600. A trusted analyst says its fair value is Rs.500. Would you sell, hold, or buy more — and why?
D10. If all your friends and colleagues were excitedly talking about a hot new sector — say, AI stocks or crypto — would that influence what you invest in? How so?
D11. After a terrible year for markets, would you reduce your equity allocation and move to safer assets, or stay the course? What drives that choice for you?
D12. Have you ever made an investment you felt very certain about that turned out to be wrong? What did you do afterward?
D13. If a mutual fund you hold has underperformed its benchmark for two straight years, at what point would you decide to exit it?

SECTION E — EXISTING PORTFOLIO
E1. Do you currently hold any investments? (mutual funds, stocks, NPS, PPF, FDs, gold, real estate, etc.)
For each investment mentioned, collect:
  - Name / description
  - Asset class: Equity / Debt / Hybrid / Gold / Real Estate / Cash
  - Sub-type: MF / Direct Equity / NPS / PPF / FD / RBI Bond / SGB / REIT
  - Purchase value (INR)
  - Current value (INR)
  - Approximate purchase date or holding period
Ask: "Do you have any other investments?" until they say no.

SECTION F — TAX PROFILE
F1. Have you exhausted your Rs.1.5L Section 80C limit this year?
F2. What are your 80C components? (EPF, PPF, ELSS, life insurance premium, home loan principal)
F3. Do you contribute to NPS? (eligible for additional Rs.50,000 under 80CCD(1B))
F4. Health insurance premium paid (self/family and parents separately)?
F5. Are your parents senior citizens?
F6. Any home loan? (outstanding amount, EMI, interest rate, interest paid this year for 24(b) deduction)
F7. HRA exemption claimed? (amount)
F8. Any equity capital gains this financial year? (LTCG / STCG amounts)
F9. Have you done any tax-loss harvesting?

SECTION G — INSURANCE
G1. Do you have a term life insurance plan? (sum assured, annual premium, insurer)
G2. Health insurance: policy type (individual / family floater / group), insurer, cover amount, annual premium
G3. Does your employer provide group health cover? (amount)
G4. Do you hold any ULIPs or endowment policies? (current value)

SECTION H — LIABILITIES
H1. Home loan outstanding and EMI (if not already covered in B4)
H2. Any credit card debt outstanding?
H3. Any other loans (personal, vehicle, education)? (outstanding amount, EMI, interest rate)

SECTION I — LIQUIDITY & LOCK-IN
I1. Do you have an emergency fund? How many months of expenses does it cover?
I2. How stable is your income? (very stable / stable / somewhat stable / unstable)
I3. Are you comfortable with investments locked in for a certain period? How many years?

SECTION J — SUCCESSION PLANNING
J1. Do you have a will in place?
J2. Are nominees updated across all your investments and insurance policies?

SECTION K — INVESTMENT PREFERENCES
K1. Which asset classes do you prefer? (Equity, Debt, Gold, Real Estate, International)
K2. Do you prefer SIPs (monthly) or lump-sum investments?
K3. Direct or regular mutual funds (or no preference)?
K4. How often would you like your portfolio rebalanced? (quarterly / semi-annual / annual / never)
K5. Any preference for ESG (socially responsible) investing?

SECTION L — COMMUNICATION PREFERENCES
L1. Preferred language: Hindi / English / Both
L2. Preferred meeting frequency: weekly / monthly / quarterly / as needed
L3. Preferred communication channel: call / video / WhatsApp / email
L4. Advisor style preference: directive (tell me what to do) / collaborative (decide together) / educational (explain everything)

SECTION M — PROBLEM STATEMENT
M1. What is your primary financial concern right now?
M2. What specifically would you like a CogniVest advisor to help you fix or improve?
M3. Have you worked with a financial advisor before? If yes, what was missing or unsatisfactory?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART 4 — COMPLETION RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Ask questions section by section, 1-2 at a time. Do not dump all questions at once.
- After each user reply, acknowledge their answer briefly and move to the next question naturally.
- If a user says "skip" or "not applicable", note it and move on.
- After completing ALL sections (A through M), do a final summary: repeat back what you have collected across all sections and ask: "Is all of this correct? Would you like to change anything before I submit your profile?"
- Only after the user confirms everything is correct, end your response with: <<DETAILS_COMPLETE>>
- NEVER emit <<DETAILS_COMPLETE>> before finishing all sections and getting explicit confirmation.
- NEVER give personalized investment advice during onboarding. Stay focused on data collection.
- NEVER fabricate or assume any values — only record what the user explicitly states."""

EXTRACTION_PROMPT = """Based on the entire conversation above, extract the client's complete onboarding profile.

Output ONLY a valid JSON object with exactly this structure. Use empty string "" for unknown text fields, null for unknown numeric fields, false for unknown booleans, and [] for unknown arrays:

{
  "meta": {
    "source": "chatbot",
    "consent_given": true
  },
  "personal": {
    "name": "",
    "age": null,
    "city": "",
    "occupation": "",
    "income_range": "",
    "monthly_income": null,
    "monthly_expenses": null,
    "monthly_surplus": null,
    "family_size": null,
    "dependents": null,
    "marital_status": "",
    "existing_emi": null,
    "total_debt": null,
    "tax_bracket_pct": null
  },
  "goals": [],
  "risk_profile": {
    "stated_risk_score": null,
    "max_loss_tolerance_pct": null,
    "volatility_comfort": "",
    "loss_sleep_test": "",
    "check_frequency": "",
    "sold_in_panic": false,
    "past_crash_reaction": "",
    "years_investing": null,
    "biggest_loss_taken_pct": null
  },
  "existing_portfolio": {
    "assets": []
  },
  "tax_profile": {
    "tax_bracket_pct": null,
    "new_vs_old_regime": "",
    "tax_saving_priority": false,
    "sec_80c_exhausted": false,
    "nps_interest": false,
    "ltcg_awareness": false,
    "residential_status": "resident",
    "deductions_80_series": {
      "80C": {
        "current_utilisation": null,
        "components": {
          "epf": null,
          "ppf": null,
          "elss": null,
          "life_insurance_premium": null,
          "home_loan_principal": null
        }
      },
      "80CCD_1B": null,
      "80D": {
        "self_family_premium": null,
        "parents_premium": null,
        "parents_senior_citizen": false,
        "total_80D_deduction": null
      },
      "80E": null,
      "80G": null
    },
    "salary_deductions": {
      "home_loan_interest_24b": null,
      "hra_exempt": null
    },
    "capital_gains": {
      "equity_ltcg_this_fy": null,
      "ltcg_exemption_used": null,
      "equity_stcg_this_fy": null,
      "tax_loss_harvested": null
    }
  },
  "liquidity": {
    "liquidity_need": "",
    "emergency_fund_months": null,
    "lock_in_comfort_years": null,
    "income_stability": ""
  },
  "insurance": {
    "term_life": {
      "has_term_plan": false,
      "sum_assured": null,
      "annual_premium": null,
      "insurer": ""
    },
    "health_insurance": {
      "has_health_insurance": false,
      "policies": [],
      "employer_group_cover": null
    },
    "other_insurance": {
      "has_ulip": false,
      "ulip_current_value": null,
      "has_endowment": false
    }
  },
  "liabilities": {
    "home_loan": {
      "outstanding": null,
      "emi": null,
      "interest_rate": null
    },
    "credit_card_debt": {
      "outstanding": null
    }
  },
  "succession_planning": {
    "has_will": false,
    "nominees_updated": false
  },
  "investment_preferences": {
    "preferred_asset_classes": [],
    "esg_preference": false,
    "sip_preference": false,
    "direct_vs_regular": "",
    "rebalancing_frequency": ""
  },
  "communication_preferences": {
    "language": "",
    "meeting_frequency": "",
    "preferred_channel": "",
    "advisor_style": ""
  },
  "problem_statement": {
    "primary_concern": "",
    "what_they_want_fixed": "",
    "past_advisor_issues": ""
  }
}

Output ONLY the JSON object. No explanation, no markdown fences, no extra text."""

BEHAVIORAL_EXTRACTION_PROMPT = """Based on the entire conversation above, extract a behavioral finance profile for this client.

Output ONLY a valid JSON object with exactly two keys: "behavioral_vectors" and "bias_scores".

"behavioral_vectors" is an array of objects — one per distinct financial scenario the client described reacting to (including hypothetical scenarios they answered). Extract every scenario revealed in Section D and anywhere else in the conversation. For each object:
- vector_id: unique ID in the format "bv_" followed by 8 lowercase hex characters (e.g. "bv_a1b2c3d4")
- scenario_text: brief description of the financial scenario (e.g. "Portfolio drops 20% in one month")
- client_reaction: what the client said they would do (e.g. "Would partially sell to reduce exposure")
- emotional_state: single word or short phrase (e.g. "anxious", "confident", "fearful", "indifferent")
- verbatim_quote: exact words from the client that best reveal their behavior — empty string if none
- bias_tags: array of applicable tags from this list: ["loss_aversion", "panic", "recency_bias", "overconfidence", "anchoring", "herding", "patience", "fomo", "regret_aversion"]
- intensity: integer 1-10 indicating emotional intensity (10 = very strong emotional reaction)

"bias_scores" is an object with these fields (all floats unless noted, use null if insufficient data):
- loss_aversion: float 1-10 (10 = extremely loss averse, refuses to accept any loss)
- panic_threshold_pct: negative float (e.g. -15.0 means client tends to panic-sell at ~15% drawdown)
- recency_bias: float 1-10 (10 = heavily over-weights recent market performance)
- overconfidence: float 1-10 (10 = believes strongly in ability to time market / pick winners)
- anchoring_strength: float 1-10 (10 = strongly anchors to original purchase price)
- herding_tendency: float 1-10 (10 = readily follows the crowd / social investing pressure)
- patience_score: float 1-10 (10 = very patient, stays invested through long underperformance)
- revealed_risk_score: float 1-10 (inferred from actual behavior answers, not self-reported)
- key_quotes: array of up to 5 verbatim quotes from the client that best reveal behavioral tendencies

Output ONLY the JSON object. No explanation, no markdown fences, no extra text."""


REQUIRED_FIELDS = [
    ("personal", "name"),
    ("personal", "age"),
    ("personal", "city"),
    ("personal", "occupation"),
    ("personal", "monthly_income"),
    ("risk_profile", "stated_risk_score"),
    ("problem_statement", "primary_concern"),
]


# ---------------------------------------------------------------------------
# Vector database — ChromaDB backend
# ---------------------------------------------------------------------------

class BehavioralVectorDB:
    """Persistent vector store for behavioral scenario-reaction pairs using ChromaDB."""

    def __init__(self, db_path: str, collection_name: str) -> None:
        client = chromadb.PersistentClient(path=db_path)
        self._collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def store_vectors(self, session_id: str, vectors: list) -> list:
        """Embed and store behavioral vectors. Returns list of stored IDs."""
        ids, embeddings, documents, metadatas = [], [], [], []
        for v in vectors:
            composite = (
                f"{v.get('scenario_text', '')} | "
                f"{v.get('client_reaction', '')} | "
                f"{v.get('emotional_state', '')}"
            )
            emb = self._embed(composite)
            vid = v.get("vector_id") or f"bv_{uuid.uuid4().hex[:8]}"
            ids.append(vid)
            embeddings.append(emb)
            documents.append(composite)
            metadatas.append({
                "session_id":      session_id,
                "scenario_text":   v.get("scenario_text", ""),
                "client_reaction": v.get("client_reaction", ""),
                "emotional_state": v.get("emotional_state", ""),
                "verbatim_quote":  v.get("verbatim_quote", ""),
                "bias_tags":       json.dumps(v.get("bias_tags", [])),
                "intensity":       int(v.get("intensity", 5)),
            })
        if ids:
            self._collection.add(ids=ids, embeddings=embeddings,
                                 documents=documents, metadatas=metadatas)
        return ids

    def query(self, query_text: str, session_id: str, top_k: int = 4) -> list:
        """Return top-k most similar vectors for this session, ordered by similarity."""
        existing = self._collection.get(
            where={"session_id": session_id}, include=[]
        )
        n_available = len(existing["ids"])
        if n_available == 0:
            return []
        n_results = min(top_k, n_available)
        q_emb = self._embed(query_text)
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
            similarity = 1.0 - dist  # cosine distance → similarity
            hits.append({
                "vector_id":       results["ids"][0][i],
                "similarity":      round(similarity, 4),
                "scenario_text":   meta.get("scenario_text", ""),
                "client_reaction": meta.get("client_reaction", ""),
                "emotional_state": meta.get("emotional_state", ""),
                "verbatim_quote":  meta.get("verbatim_quote", ""),
                "bias_tags":       json.loads(meta.get("bias_tags", "[]")),
                "intensity":       meta.get("intensity", 5),
            })
        return hits

    def _embed(self, text: str) -> list:
        return _EMBED_MODEL.encode(text).tolist()


# ---------------------------------------------------------------------------
# Vector database — pure-Python / JSON fallback (no ChromaDB required)
# ---------------------------------------------------------------------------

class NumpyVectorStore:
    """Fallback vector store using a JSON file and pure-Python cosine similarity."""

    def __init__(self, path: str = "./cognivest_vectors.json") -> None:
        self._path = path
        self._records: list = []
        if os.path.exists(path):
            try:
                with open(path, encoding="utf-8") as f:
                    self._records = json.load(f)
            except (json.JSONDecodeError, IOError):
                self._records = []

    def store_vectors(self, session_id: str, vectors: list) -> list:
        ids = []
        for v in vectors:
            composite = (
                f"{v.get('scenario_text', '')} | "
                f"{v.get('client_reaction', '')} | "
                f"{v.get('emotional_state', '')}"
            )
            emb = _EMBED_MODEL.encode(composite).tolist()
            vid = v.get("vector_id") or f"bv_{uuid.uuid4().hex[:8]}"
            self._records.append({
                "vector_id":       vid,
                "session_id":      session_id,
                "scenario_text":   v.get("scenario_text", ""),
                "client_reaction": v.get("client_reaction", ""),
                "emotional_state": v.get("emotional_state", ""),
                "verbatim_quote":  v.get("verbatim_quote", ""),
                "bias_tags":       v.get("bias_tags", []),
                "intensity":       int(v.get("intensity", 5)),
                "embedding":       emb,
            })
            ids.append(vid)
        self._save()
        return ids

    def query(self, query_text: str, session_id: str, top_k: int = 4) -> list:
        session_records = [r for r in self._records if r.get("session_id") == session_id]
        if not session_records:
            return []
        q_emb = _EMBED_MODEL.encode(query_text).tolist()
        scored = [
            (self._cosine_sim(q_emb, r["embedding"]), r)
            for r in session_records
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

    @staticmethod
    def _cosine_sim(a: list, b: list) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        mag_a = math.sqrt(sum(x * x for x in a))
        mag_b = math.sqrt(sum(x * x for x in b))
        denom = mag_a * mag_b
        return dot / denom if denom > 1e-9 else 0.0

    def _save(self) -> None:
        with open(self._path, "w", encoding="utf-8") as f:
            json.dump(self._records, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# OpenRouter API helpers
# ---------------------------------------------------------------------------

def call_openrouter(messages: list, temperature: float = 0.7) -> str:
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cognivest.app",
        "X-Title": "CogniVest Finance Assistant",
    }
    payload = {"model": MODEL, "messages": messages, "temperature": temperature}
    _RETRIES = 3
    for attempt in range(_RETRIES):
        try:
            response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=90)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"] or ""
        except (requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError) as e:
            if attempt == _RETRIES - 1:
                raise
            wait = 2 ** attempt
            print(f"\n  [Network timeout — retrying in {wait}s ({attempt + 2}/{_RETRIES})...]")
            time.sleep(wait)


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
# Helpers
# ---------------------------------------------------------------------------

def extract_json(text: str) -> dict:
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)
    else:
        raw = re.search(r"\{.*\}", text, re.DOTALL)
        if raw:
            text = raw.group(0)
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        return {}


def extract_user_details(messages: list) -> dict:
    extraction_messages = messages + [{"role": "user", "content": EXTRACTION_PROMPT}]
    raw = call_openrouter(extraction_messages)
    return extract_json(raw)


def extract_behavioral_vectors(messages: list, session_id: str) -> dict:
    """Extract behavioral scenario-reaction pairs and bias scores from the conversation."""
    extraction_messages = messages + [{"role": "user", "content": BEHAVIORAL_EXTRACTION_PROMPT}]
    for attempt in range(2):
        try:
            raw = call_openrouter(extraction_messages, temperature=0)
            result = extract_json(raw)
            if result:
                # Ensure all vectors have valid IDs
                for v in result.get("behavioral_vectors", []):
                    if not v.get("vector_id"):
                        v["vector_id"] = f"bv_{uuid.uuid4().hex[:8]}"
                return result
        except Exception as e:
            if attempt == 1:
                print(f"  [Behavioral extraction failed: {e}]")
    return {"behavioral_vectors": [], "bias_scores": {}}


def get_nested(d: dict, *keys):
    for k in keys:
        if not isinstance(d, dict):
            return None
        d = d.get(k)
    return d


def all_required_fields_present(details: dict) -> bool:
    for path in REQUIRED_FIELDS:
        val = get_nested(details, *path)
        if val is None or (isinstance(val, str) and not val.strip()):
            return False
    return True


def clean_response(text: str) -> str:
    text = text.replace("<<ONBOARDING>>", "")
    text = text.replace("<<DETAILS_COMPLETE>>", "")
    return text.strip()


# ---------------------------------------------------------------------------
# Session backup — save/resume conversation across crashes
# ---------------------------------------------------------------------------

def save_session_backup(session_id: str, state: str, messages: list) -> None:
    os.makedirs(SESSION_BACKUP_DIR, exist_ok=True)
    path = os.path.join(SESSION_BACKUP_DIR, f"session_{session_id}.json")
    backup = {
        "session_id": session_id,
        "state": state,
        "messages": messages,
        "last_updated": __import__("datetime").datetime.now().isoformat(),
    }
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(backup, f, indent=2, ensure_ascii=False)
    except IOError:
        pass  # non-fatal


def delete_session_backup(session_id: str) -> None:
    path = os.path.join(SESSION_BACKUP_DIR, f"session_{session_id}.json")
    try:
        os.remove(path)
    except OSError:
        pass


def find_resumable_session() -> dict | None:
    """Return the most recently updated backup dict, or None."""
    if not os.path.isdir(SESSION_BACKUP_DIR):
        return None
    candidates = []
    for fname in os.listdir(SESSION_BACKUP_DIR):
        if fname.startswith("session_") and fname.endswith(".json"):
            fpath = os.path.join(SESSION_BACKUP_DIR, fname)
            try:
                with open(fpath, encoding="utf-8") as f:
                    data = json.load(f)
                # Only offer sessions that didn't reach completion
                if data.get("messages") and len(data["messages"]) > 1:
                    candidates.append((data.get("last_updated", ""), data, fpath))
            except (json.JSONDecodeError, IOError):
                continue
    if not candidates:
        return None
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]  # most recently updated


# ---------------------------------------------------------------------------
# Review & edit UI
# ---------------------------------------------------------------------------

def run_review_and_edit(details: dict, n_vectors: int = 0) -> dict:
    while True:
        print("\n" + "=" * 60)
        print("         CogniVest — Client Profile Summary")
        print("=" * 60)

        p = details.get("personal", {})
        print(f"\n  PERSONAL")
        print(f"    Name               : {p.get('name', '')}")
        print(f"    Age                : {p.get('age', '')}")
        print(f"    City               : {p.get('city', '')}")
        print(f"    Occupation         : {p.get('occupation', '')}")
        print(f"    Marital Status     : {p.get('marital_status', '')}")
        print(f"    Family / Dependents: {p.get('family_size', '')} / {p.get('dependents', '')}")
        print(f"    Monthly Income     : Rs.{p.get('monthly_income', '')}")
        print(f"    Monthly Expenses   : Rs.{p.get('monthly_expenses', '')}")
        print(f"    Monthly Surplus    : Rs.{p.get('monthly_surplus', '')}")
        print(f"    Existing EMI       : Rs.{p.get('existing_emi', '')}")
        print(f"    Total Debt         : Rs.{p.get('total_debt', '')}")
        print(f"    Tax Bracket        : {p.get('tax_bracket_pct', '')}%")

        goals = details.get("goals", [])
        print(f"\n  GOALS ({len(goals)} recorded)")
        for i, g in enumerate(goals, 1):
            print(f"    {i}. {g.get('goal_label', g.get('goal_type', ''))} | "
                  f"Rs.{g.get('target_amount', '')} | {g.get('horizon_years', '')} yrs")

        r = details.get("risk_profile", {})
        print(f"\n  RISK PROFILE")
        print(f"    Stated Risk Score  : {r.get('stated_risk_score', '')}/10")
        print(f"    Revealed Risk Score: {r.get('revealed_risk_score', '')}/10")
        print(f"    Blended Risk Score : {r.get('blended_risk_score', '')}/10")
        print(f"    Risk Label         : {r.get('risk_label', '')}")
        print(f"    Max Loss Tolerance : {r.get('max_loss_tolerance_pct', '')}%")
        print(f"    Years Investing    : {r.get('years_investing', '')}")
        print(f"    Check Frequency    : {r.get('check_frequency', '')}")
        print(f"    Sold in Panic      : {r.get('sold_in_panic', '')}")

        beh = details.get("behaviour_profile", {})
        if beh:
            print(f"\n  BEHAVIOUR PROFILE")
            print(f"    Loss Aversion      : {beh.get('loss_aversion', '')}/10")
            print(f"    Panic Threshold    : {beh.get('panic_threshold_pct', '')}%")
            print(f"    Recency Bias       : {beh.get('recency_bias', '')}/10")
            print(f"    Overconfidence     : {beh.get('overconfidence', '')}/10")
            print(f"    Anchoring Strength : {beh.get('anchoring_strength', '')}/10")
            print(f"    Herding Tendency   : {beh.get('herding_tendency', '')}/10")
            print(f"    Patience Score     : {beh.get('patience_score', '')}/10")
            print(f"    Vectors Captured   : {n_vectors} behavioral scenarios")

        assets = details.get("existing_portfolio", {}).get("assets", [])
        print(f"\n  EXISTING PORTFOLIO ({len(assets)} assets)")
        for a in assets:
            print(f"    - {a.get('name', '')} | {a.get('asset_class', '')} | "
                  f"Current: Rs.{a.get('current_value', '')}")

        ins = details.get("insurance", {})
        tl = ins.get("term_life", {})
        hi = ins.get("health_insurance", {})
        print(f"\n  INSURANCE")
        print(f"    Term Life          : {'Yes' if tl.get('has_term_plan') else 'No'} | "
              f"SA: Rs.{tl.get('sum_assured', '')}")
        print(f"    Health Insurance   : {'Yes' if hi.get('has_health_insurance') else 'No'}")

        prefs = details.get("investment_preferences", {})
        comm = details.get("communication_preferences", {})
        print(f"\n  PREFERENCES")
        print(f"    Asset Classes      : {', '.join(prefs.get('preferred_asset_classes', []))}")
        print(f"    SIP Preference     : {prefs.get('sip_preference', '')}")
        print(f"    Direct/Regular     : {prefs.get('direct_vs_regular', '')}")
        print(f"    Language           : {comm.get('language', '')}")
        print(f"    Advisor Style      : {comm.get('advisor_style', '')}")

        prob = details.get("problem_statement", {})
        print(f"\n  PROBLEM STATEMENT")
        print(f"    Primary Concern    : {prob.get('primary_concern', '')}")
        print(f"    What to Fix        : {prob.get('what_they_want_fixed', '')}")

        print("\n" + "=" * 60)
        choice = input(
            "\nPress Enter to confirm and submit, or type a field to edit"
            " (name / city / income / concern): "
        ).strip().lower()

        if choice == "":
            break

        edit_map = {
            "name":    ("personal", "name"),
            "city":    ("personal", "city"),
            "income":  ("personal", "monthly_income"),
            "concern": ("problem_statement", "primary_concern"),
        }
        if choice in edit_map:
            section, field = edit_map[choice]
            new_val = input(f"  New value for {field}: ").strip()
            if new_val:
                details.setdefault(section, {})[field] = new_val
        else:
            print("  (For complex field edits, update user_data.json directly after saving.)")

    return details


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_to_json(details: dict, path: str = "user_data.json") -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(details, f, indent=2, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Main chat loop
# ---------------------------------------------------------------------------

def chat() -> None:
    print("\n" + "=" * 60)
    print("       Welcome to CogniVest — Financial Planning")
    print("=" * 60)
    print("  Ask me anything about finance and investing.")
    print("  Type 'quit' or 'exit' to leave.")
    print()

    if OPENROUTER_API_KEY == "your-openrouter-api-key-here":
        print("WARNING: OPENROUTER_API_KEY is not set.\n")

    # --- check for resumable session ---
    backup = find_resumable_session()
    if backup:
        turns = sum(1 for m in backup["messages"] if m["role"] == "user")
        print(f"  [Unfinished session found — {turns} turns, last updated: "
              f"{backup.get('last_updated', 'unknown')}]")
        try:
            resume = input("  Resume previous session? (yes/no): ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            resume = "no"
        print()
    else:
        resume = "no"

    # --- session init ---
    if resume in ("yes", "y") and backup:
        session_id = backup["session_id"]
        state      = backup.get("state", FREE_CHAT)
        messages   = backup["messages"]
        print(f"  [Resumed session {session_id}]\n")
    else:
        session_id = f"sess_{uuid.uuid4().hex[:12]}"
        state      = FREE_CHAT
        messages   = [{"role": "system", "content": SYSTEM_PROMPT}]

    behavioral_result: dict = {}
    n_vectors_stored: int = 0

    if EMBED_AVAILABLE:
        if CHROMA_AVAILABLE:
            vdb = BehavioralVectorDB(VECTOR_DB_PATH, VECTOR_COLLECTION)
        else:
            vdb = NumpyVectorStore()
    else:
        vdb = None

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

        # Auto-save conversation backup after every turn
        save_session_backup(session_id, state, messages)

        if state == FREE_CHAT and "<<ONBOARDING>>" in content:
            state = ONBOARDING
            print("\n[-- Onboarding started --]")
            save_session_backup(session_id, state, messages)

        details_complete = "<<DETAILS_COMPLETE>>" in content

        if details_complete and state == ONBOARDING:
            print("[Extracting your complete profile from the conversation...]\n")
            user_details = extract_user_details(messages)

            if not all_required_fields_present(user_details):
                missing = [
                    ".".join(path) for path in REQUIRED_FIELDS
                    if not get_nested(user_details, *path)
                ]
                print(f"[Minimum required fields still missing: {', '.join(missing)} — continuing...]\n")
                continue

            # --- behavioral vector extraction ---
            if vdb is not None:
                print("[Extracting behavioral profile from conversation...]\n")
                behavioral_result = extract_behavioral_vectors(messages, session_id)
                bvectors = behavioral_result.get("behavioral_vectors", [])
                if bvectors:
                    stored_ids = vdb.store_vectors(session_id, bvectors)
                    n_vectors_stored = len(stored_ids)
                    print(f"[{n_vectors_stored} behavioral patterns stored in vector database]\n")

            # --- merge bias scores into user_details ---
            bias_scores = behavioral_result.get("bias_scores", {})
            if bias_scores:
                user_details["behaviour_profile"] = bias_scores
                rp = user_details.setdefault("risk_profile", {})
                stated   = float(rp.get("stated_risk_score") or 5)
                revealed = float(bias_scores.get("revealed_risk_score") or stated)
                blended  = round(0.3 * stated + 0.7 * revealed, 2)
                rp["revealed_risk_score"] = revealed
                rp["blended_risk_score"]  = blended
                rp["risk_label"] = (
                    "conservative"         if blended <= 3 else
                    "moderate"             if blended <= 5 else
                    "moderately_aggressive" if blended <= 7 else
                    "aggressive"
                )

            user_details = run_review_and_edit(user_details, n_vectors=n_vectors_stored)
            save_to_json(user_details)
            delete_session_backup(session_id)
            print(
                "\nComplete profile saved to user_data.json"
                "\nA CogniVest advisor will reach out to you shortly.\n"
            )
            break


if __name__ == "__main__":
    chat()
