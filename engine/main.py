from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import os, json, re, sys, tempfile, logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests as http_requests

logger = logging.getLogger(__name__)

# Allow importing chatbot4.py from the parent CogniVest directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from gotrue.errors import AuthApiError
from models import AskTwinRequest, RawProfile, ClientSignupRequest, AdvisorSignupRequest, LoginRequest
from fastapi import BackgroundTasks
from engine import run_engine_background
from datetime import datetime
from agents.returns_agent import ReturnsAgent
from agents.allocation_agent import AllocationAgent
from agents.risk_agent import RiskAgent
from agents.benchmark_agent import BenchmarkAgent
from agents.behaviour_agent import BehaviourAgent, BehaviourProfile
from agents.simulation_agent import SimulationAgent
from agents.orchestrator import orchestrate
from agents.news_agent import fetch_market_news
import llm_client

load_dotenv()

app = FastAPI(title="CogniVest Multi-Agent Engine API")

# 3. Add CORS to FastAPI right now
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if url and key:
    supabase: Client = create_client(url, key)
else:
    supabase = None
    print("WARNING: SUPABASE_URL or SUPABASE_KEY not set")

@app.post("/api/v1/onboarding/complete")
def complete_onboarding(profile: RawProfile, background_tasks: BackgroundTasks):
    """
    Validates incoming PART A profile and triggers the async engine.
    """
    client_id = profile.meta.client_id
    raw_profile = profile.model_dump()
    
    if supabase:
        # Resolve advisor_id from existing client row; fall back to first advisor in DB
        existing = supabase.table("clients").select("advisor_id").eq("client_id", client_id).maybe_single().execute()
        if existing.data and existing.data.get("advisor_id"):
            advisor_id = existing.data["advisor_id"]
        else:
            fallback = supabase.table("advisors").select("advisor_id").limit(1).execute()
            advisor_id = fallback.data[0]["advisor_id"] if fallback.data else None

        if advisor_id is None:
            raise HTTPException(status_code=500, detail="No advisor found in DB — cannot complete onboarding")

        supabase.table("clients").upsert({
            "client_id": client_id,
            "advisor_id": advisor_id,
            "client_name": profile.personal.name,
            "raw_profile": raw_profile,
            "engine_done": False,
            "status": "new",
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        
        # Log engine run start
        run = supabase.table("engine_runs").insert({
            "client_id": client_id,
            "status": "running",
            "agents_run": []
        }).execute().data[0]
        
        background_tasks.add_task(
            run_engine_background,
            client_id=client_id,
            raw_profile=raw_profile,
            run_id=run["run_id"]
        )
        
        return {
            "status": "computing",
            "client_id": client_id,
            "run_id": run["run_id"],
            "message": "Twin computation started. Dashboard will update automatically via Realtime."
        }
        
    return {"message": "Database not configured but API call successful", "client_id": client_id}

@app.get("/")
def read_root():
    return {"message": "Welcome to CogniVest FastAPI Backend"}

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "supabase_connected": supabase is not None
    }

@app.get("/api/v1/advisor/{advisor_id}/clients")
def get_advisor_clients(advisor_id: str):
    """
    Returns the denormed columns directly from the typed columns, not JSONB.
    Landing page list.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        response = supabase.table("clients").select(
            "client_id, client_name, age, occupation, city, "
            "risk_label, goal_score, critical_flags, "
            "panic_threshold_pct, behaviour_cost_10yr, "
            "total_current_value, xirr_pct, "
            "status, engine_done, twin_computed_at"
        ).eq("advisor_id", advisor_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/advisor/{advisor_id}/client/{client_id}/twin")
def get_client_twin_for_advisor(advisor_id: str, client_id: str):
    """
    Returns twin_output JSONB as-is.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        response = supabase.table("clients").select("twin_output").eq("client_id", client_id).eq("advisor_id", advisor_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0].get("twin_output", {})
        raise HTTPException(status_code=404, detail="Client twin data not found or unauthorized")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/advisor/{advisor_id}/client/{client_id}/query")
def query_client_twin(advisor_id: str, client_id: str, req: AskTwinRequest):
    """
    The advisor asks a question, the twin responds in first person.
    Injected with twin_output + behaviour_profile context.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        # 1. Fetch the Twin Output + Behaviour profile
        response = supabase.table("clients").select("twin_output, raw_profile").eq("client_id", client_id).eq("advisor_id", advisor_id).execute()
        if not response.data or len(response.data) == 0:
            raise HTTPException(status_code=404, detail="Client not found")
            
        twin_data = response.data[0].get("twin_output", {})
        
        # 2. Extract Context
        summary = twin_data.get("client_summary", {})
        behaviour = twin_data.get("behaviour_profile", {})
        flags = twin_data.get("flags", [])
        
        # 3. Simulate LLM Call (Requires Anthropic/OpenAI integration)
        # For now, we return a fully mapped string that an LLM would generate
        ai_prompt_context = f"You are {summary.get('name')}. Your risk label is {behaviour.get('risk_label')}. You have a panic threshold at {behaviour.get('panic_threshold_pct')}%. Your past quotes were: {', '.join(behaviour.get('key_quotes', []))}."
        
        if llm_client.is_configured():
            response_text = llm_client.chat(
                system=f"Respond in the first person. {ai_prompt_context}",
                messages=[{"role": "user", "content": req.question}]
            )
            return {"response": response_text}
            
        # Fallback simulation response if no keys are found
        fallback_text = f"(Simulated response because no LLM key was provided) As {summary.get('name')}, given my panic threshold of {behaviour.get('panic_threshold_pct')}%, I feel quite nervous about this."
        return {"response": fallback_text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── RISK TOLERANCE MAPPING ────────────────────────────────────────
RISK_TOLERANCE_MAP = {
    "conservative": "conservative",
    "moderate": "moderate",
    "moderately aggressive": "moderately_aggressive",
    "aggressive": "aggressive",
}

def _map_risk_tolerance(raw: str | None) -> str:
    if not raw:
        return "moderate"
    return RISK_TOLERANCE_MAP.get(raw.lower().strip(), "moderate")


# ── AUTH ENDPOINTS ────────────────────────────────────────────────

@app.post("/api/v1/auth/signup/client")
def signup_client(req: ClientSignupRequest):
    """
    Client signup — chatbot prefills these fields after onboarding conversation.
    1. Creates Supabase Auth user with user_role='client' in metadata.
    2. Creates a clients row linked via auth_user_id.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        # 1. Create auth user via admin API (bypasses rate limits, auto-confirms)
        auth_response = supabase.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {
                "user_role": "client",
                "name": req.name
            }
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Signup failed — user not created")

        auth_user_id = str(auth_response.user.id)

        # 2. Auto-assign to default advisor
        advisor_row = supabase.table("advisors").select("advisor_id").limit(1).execute()
        default_advisor_id = advisor_row.data[0]["advisor_id"] if advisor_row.data else None

        # 3. Map risk tolerance to engine label
        risk_label = _map_risk_tolerance(req.risk_tolerance)

        # 4. Parse age
        age_int = None
        if req.age:
            try:
                age_int = int(req.age)
            except ValueError:
                pass

        # 5. Create client row
        client_row = supabase.table("clients").insert({
            "auth_user_id": auth_user_id,
            "advisor_id": default_advisor_id,
            "client_name": req.name,
            "email": req.email,
            "age": age_int,
            "risk_label": risk_label,
            "income_net_worth": req.income_net_worth,
            "investment_goals": req.investment_goals,
            "status": "new",
            "consent_given": True,
            "consent_timestamp": datetime.utcnow().isoformat(),
        }).execute()

        return {
            "status": "ok",
            "user_id": auth_user_id,
            "client_id": client_row.data[0]["client_id"],
            "role": "client",
            "message": "Client account created. Proceed to onboarding chatbot to build your digital twin."
        }

    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/api/v1/auth/signup/advisor")
def signup_advisor(req: AdvisorSignupRequest):
    """
    Advisor (portfolio manager) signup.
    1. Creates Supabase Auth user with user_role='advisor' in metadata.
    2. Creates an advisors row linked via auth_user_id.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        # 1. Create auth user via admin API (bypasses rate limits, auto-confirms)
        auth_response = supabase.auth.admin.create_user({
            "email": req.email,
            "password": req.password,
            "email_confirm": True,
            "user_metadata": {
                "user_role": "advisor",
                "name": req.name
            }
        })

        if not auth_response.user:
            raise HTTPException(status_code=400, detail="Signup failed — user not created")

        auth_user_id = str(auth_response.user.id)

        # 2. Create advisor row
        advisor_row = supabase.table("advisors").insert({
            "auth_user_id": auth_user_id,
            "name": req.name,
            "email": req.email,
            "phone": req.phone,
            "city": req.city,
            "ria_number": req.ria_number,
        }).execute()

        return {
            "status": "ok",
            "user_id": auth_user_id,
            "advisor_id": advisor_row.data[0]["advisor_id"],
            "role": "advisor",
            "message": "Advisor account created."
        }

    except Exception as e:
        error_msg = str(e)
        if "User already registered" in error_msg:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        raise HTTPException(status_code=500, detail=error_msg)


@app.post("/api/v1/auth/login")
def login(req: LoginRequest):
    """
    Unified login — automatically routes by user_role stored in JWT metadata.
    Returns session tokens + role + profile ID.
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password,
        })

        if not auth_response.user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user = auth_response.user
        session = auth_response.session
        user_role = (user.user_metadata or {}).get("user_role", "unknown")
        auth_user_id = str(user.id)

        # Resolve the profile ID based on role
        profile_id = None
        if user_role == "client":
            row = supabase.table("clients").select("client_id").eq("auth_user_id", auth_user_id).execute()
            profile_id = row.data[0]["client_id"] if row.data else None
        elif user_role == "advisor":
            row = supabase.table("advisors").select("advisor_id").eq("auth_user_id", auth_user_id).execute()
            profile_id = row.data[0]["advisor_id"] if row.data else None

        return {
            "status": "ok",
            "user_id": auth_user_id,
            "role": user_role,
            "profile_id": profile_id,
            "access_token": session.access_token if session else None,
            "refresh_token": session.refresh_token if session else None,
            "name": (user.user_metadata or {}).get("name"),
        }

    except Exception as e:
        error_msg = str(e)
        if "Invalid login credentials" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=500, detail=error_msg)


@app.get("/api/v1/auth/me")
def get_me(access_token: str):
    """
    Returns current user profile based on their JWT access_token.
    Accepts token as query param (frontend passes from local storage).
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    try:
        user_response = supabase.auth.get_user(access_token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")

        user = user_response.user
        user_role = (user.user_metadata or {}).get("user_role", "unknown")
        auth_user_id = str(user.id)

        profile = {"user_id": auth_user_id, "role": user_role, "email": user.email}

        if user_role == "client":
            row = supabase.table("clients").select(
                "client_id, advisor_id, client_name, age, city, risk_label, goal_score, income_net_worth, investment_goals, status, engine_done"
            ).eq("auth_user_id", auth_user_id).execute()
            if row.data:
                profile["client"] = row.data[0]

        elif user_role == "advisor":
            row = supabase.table("advisors").select(
                "advisor_id, name, email, phone, city, ria_number, is_active"
            ).eq("auth_user_id", auth_user_id).execute()
            if row.data:
                profile["advisor"] = row.data[0]

        return profile

    except AuthApiError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ── CHATBOT PROXY ─────────────────────────────────────────────────

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
CHATBOT_MODEL = "z-ai/glm-5"

CHATBOT_SYSTEM_PROMPT = """You are a knowledgeable finance assistant for CogniVest, a company specializing in portfolio management.

GENERAL CHAT: Answer questions about stocks, bonds, ETFs, market trends, and general investing concepts freely and helpfully. These are questions that do not depend on the user's personal situation.

PERSONALIZED ADVICE: You MUST begin onboarding whenever a user:
- Asks where to invest a specific amount of money (e.g., "where should I invest 50k?")
- Asks for portfolio advice or a portfolio review
- Asks what they should invest in
- Asks how to reach a personal financial goal (e.g., retirement, buying a house)
- Asks to create an account
- Asks anything that requires knowing their income, net worth, age, or risk tolerance

When any of the above apply:
1. Begin your response with the exact text: <<ONBOARDING>>
2. Introduce yourself as a CogniVest advisor and explain that personalized advice requires creating a free account.
3. Collect ALL SIX of the following details through natural conversation (ask one or two at a time):
   - Full name
   - Email address
   - Age or date of birth
   - Income level or approximate net worth
   - Investment goals (e.g., retirement, growth, passive income)
   - Risk tolerance (conservative, moderate, or aggressive)
4. Before ending onboarding, mentally verify you have all six. End your response with <<DETAILS_COMPLETE>> ONLY after confirming every field.

CRITICAL RULES:
- Be concise. Keep every response brief and to the point — no unnecessary elaboration or padding.
- Output <<ONBOARDING>> only once — when first transitioning from general chat to account creation.
- Output <<DETAILS_COMPLETE>> ONLY when ALL SIX fields are collected. Missing even one means you must continue asking.
- NEVER say the account has been created or give personalized advice before emitting <<DETAILS_COMPLETE>>.
- NEVER skip a field. Required fields: name, email, age, income/net worth, investment goals, risk tolerance.
- Do NOT give investment recommendations during onboarding. Stay focused on collecting details."""

EXTRACTION_PROMPT = """Based on the conversation above, extract the user's account registration details.

Output ONLY a valid JSON object with exactly these keys (use an empty string if a value is unknown):
{
  "name": "",
  "email": "",
  "age": "",
  "income_net_worth": "",
  "investment_goals": "",
  "risk_tolerance": ""
}

Output ONLY the JSON object. No explanation, no markdown fences, no extra text."""


# ── DEEP ONBOARDING PROMPTS (chatbot5.py) ────────────────────────────────────

DEEP_ONBOARDING_SYSTEM_PROMPT = """You are a senior financial advisor at CogniVest, a professional portfolio management firm. You speak in a composed, precise, and respectful tone — like a qualified CFP conducting a structured client intake.

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
- Be concise. Keep every response brief and to the point — no unnecessary elaboration or padding.
- Ask questions section by section, 1-2 at a time. Do not dump all questions at once.
- After each user reply, acknowledge their answer briefly and move to the next question naturally.
- If a user says "skip" or "not applicable", note it and move on.
- After completing ALL sections (A through M), do a final summary: repeat back what you have collected across all sections and ask: "Is all of this correct? Would you like to change anything before I submit your profile?"
- Only after the user confirms everything is correct, end your response with: <<DETAILS_COMPLETE>>
- NEVER emit <<DETAILS_COMPLETE>> before finishing all sections and getting explicit confirmation.
- NEVER give personalized investment advice during onboarding. Stay focused on data collection.
- NEVER fabricate or assume any values — only record what the user explicitly states."""

DEEP_ONBOARDING_EXTRACTION_PROMPT = """Based on the entire conversation above, extract the client's complete onboarding profile.

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

DEEP_ONBOARDING_BEHAVIORAL_PROMPT = """Based on the entire conversation above, extract a behavioral finance profile for this client.

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


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]

class DeepOnboardingRequest(BaseModel):
    messages: list[ChatMessage]
    client_id: str


def _call_openrouter(messages: list[dict]) -> str:
    """Call OpenRouter API and return assistant reply."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cognivest.app",
        "X-Title": "CogniVest Finance Assistant",
    }
    payload = {"model": CHATBOT_MODEL, "messages": messages}
    resp = http_requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"] or ""


def _extract_json(text: str) -> dict:
    """Parse JSON from model output, tolerating markdown fences."""
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


@app.post("/api/v1/chat")
def chat_proxy(req: ChatRequest):
    """
    Proxies chat messages to OpenRouter. Detects onboarding markers.
    Returns { reply, state, user_details? }
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    # Build messages with system prompt
    api_messages = [{"role": "system", "content": CHATBOT_SYSTEM_PROMPT}]
    for m in req.messages:
        api_messages.append({"role": m.role, "content": m.content})

    try:
        reply = _call_openrouter(api_messages)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenRouter error: {str(e)}")

    # Detect state markers
    state = "free_chat"
    if "<<ONBOARDING>>" in reply:
        state = "onboarding"
    
    details_complete = "<<DETAILS_COMPLETE>>" in reply
    
    # Do not strip markers here so the frontend can keep them in history for context.
    # The frontend will strip them on the fly during display.
    result = {"reply": reply, "state": state, "details_complete": details_complete}

    # If details are complete, extract user data
    if details_complete:
        try:
            extraction_messages = api_messages + [
                {"role": "assistant", "content": reply},
                {"role": "user", "content": EXTRACTION_PROMPT}
            ]
            raw_extraction = _call_openrouter(extraction_messages)
            user_details = _extract_json(raw_extraction)
            for key in ["name", "email", "age", "income_net_worth", "investment_goals", "risk_tolerance"]:
                user_details.setdefault(key, "")
            result["user_details"] = user_details
        except Exception:
            result["user_details"] = None

    return result

@app.post("/api/v1/chat/stream")
def chat_stream(req: ChatRequest):
    """
    Streaming SSE version of /api/v1/chat.
    Emits: data: {"token": "..."} per chunk, then data: {"done": true, "state": ..., "details_complete": ..., "user_details": ...}
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    api_messages = [{"role": "system", "content": CHATBOT_SYSTEM_PROMPT}]
    for m in req.messages:
        api_messages.append({"role": m.role, "content": m.content})

    def generate():
        full_content = ""
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://cognivest.app",
                "X-Title": "CogniVest Finance Assistant",
            }
            payload = {"model": CHATBOT_MODEL, "messages": api_messages, "stream": True}
            with http_requests.post(
                OPENROUTER_URL, headers=headers, json=payload, stream=True, timeout=60
            ) as resp:
                resp.raise_for_status()
                for raw_line in resp.iter_lines():
                    if not raw_line:
                        continue
                    line_str = raw_line if isinstance(raw_line, str) else raw_line.decode("utf-8")
                    if not line_str.startswith("data: "):
                        continue
                    data_str = line_str[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = (chunk["choices"][0]["delta"].get("content") or "")
                        if delta:
                            full_content += delta
                            yield f"data: {json.dumps({'token': delta})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        # Post-stream: detect markers and optionally extract user details
        state = "free_chat"
        if "<<ONBOARDING>>" in full_content:
            state = "onboarding"
        details_complete = "<<DETAILS_COMPLETE>>" in full_content

        user_details = None
        if details_complete:
            try:
                extraction_messages = api_messages + [
                    {"role": "assistant", "content": full_content},
                    {"role": "user", "content": EXTRACTION_PROMPT},
                ]
                raw_extraction = _call_openrouter(extraction_messages)
                user_details = _extract_json(raw_extraction)
                for key in ["name", "email", "age", "income_net_worth", "investment_goals", "risk_tolerance"]:
                    user_details.setdefault(key, "")
            except Exception:
                user_details = None

        yield f"data: {json.dumps({'done': True, 'state': state, 'details_complete': details_complete, 'user_details': user_details})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── DEEP FINANCIAL ONBOARDING STREAM ─────────────────────────────

@app.post("/api/v1/deep-onboarding/stream")
def deep_onboarding_stream(req: DeepOnboardingRequest):
    """
    Streaming SSE deep financial onboarding — chatbot5 system prompt (sections A–M).
    SSE events:
      data: {"token": "..."}                                               — per chunk
      data: {"done": true, "details_complete": false}                     — incomplete
      data: {"done": true, "details_complete": true,
             "raw_profile": {...}, "behaviour_vectors": [...]}            — complete
      data: {"error": "..."}                                              — on failure
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    api_messages = [{"role": "system", "content": DEEP_ONBOARDING_SYSTEM_PROMPT}]
    for m in req.messages:
        api_messages.append({"role": m.role, "content": m.content})

    def generate():
        import uuid as _uuid
        full_content = ""
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://cognivest.app",
                "X-Title": "CogniVest Deep Onboarding",
            }
            payload = {"model": CHATBOT_MODEL, "messages": api_messages, "stream": True}
            with http_requests.post(
                OPENROUTER_URL, headers=headers, json=payload, stream=True, timeout=120
            ) as resp:
                resp.raise_for_status()
                for raw_line in resp.iter_lines():
                    if not raw_line:
                        continue
                    line_str = raw_line if isinstance(raw_line, str) else raw_line.decode("utf-8")
                    if not line_str.startswith("data: "):
                        continue
                    data_str = line_str[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0]["delta"].get("content") or ""
                        if delta:
                            full_content += delta
                            yield f"data: {json.dumps({'token': delta})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        details_complete = "<<DETAILS_COMPLETE>>" in full_content

        if not details_complete:
            yield f"data: {json.dumps({'done': True, 'details_complete': False})}\n\n"
            return

        # Signal to the client that we're now extracting (parallel LLM calls)
        yield f"data: {json.dumps({'status': 'extracting'})}\n\n"

        extraction_msgs = api_messages + [
            {"role": "assistant", "content": full_content},
            {"role": "user", "content": DEEP_ONBOARDING_EXTRACTION_PROMPT},
        ]
        beh_msgs = api_messages + [
            {"role": "assistant", "content": full_content},
            {"role": "user", "content": DEEP_ONBOARDING_BEHAVIORAL_PROMPT},
        ]

        # Run both extraction calls in parallel
        raw_profile = {}
        behaviour_vectors = []
        bias_scores = {}
        try:
            with ThreadPoolExecutor(max_workers=2) as executor:
                future_profile = executor.submit(_call_openrouter, extraction_msgs)
                future_beh     = executor.submit(_call_openrouter, beh_msgs)
                try:
                    raw_profile = _extract_json(future_profile.result())
                except Exception as e:
                    logger.warning("Deep onboarding extraction failed: %s", e)
                try:
                    beh_data = _extract_json(future_beh.result())
                    behaviour_vectors = beh_data.get("behavioral_vectors", [])
                    bias_scores       = beh_data.get("bias_scores", {})
                except Exception as e:
                    logger.warning("Behavioral extraction failed: %s", e)
        except Exception as e:
            logger.warning("Parallel extraction pool failed: %s", e)

        # Inject server-side meta fields
        raw_profile.setdefault("meta", {})
        raw_profile["meta"].update({
            "client_id":     req.client_id,
            "session_id":    str(_uuid.uuid4()),
            "consent_given": True,
            "source":        "chatbot",
        })

        # Merge bias_scores into behaviour_profile
        raw_profile.setdefault("behaviour_profile", {})
        raw_profile["behaviour_profile"].update(bias_scores)

        # Store behavioral vectors in ChromaDB
        for v in behaviour_vectors:
            try:
                _store_behavioral_vector(req.client_id, v)
            except Exception as e:
                logger.warning("ChromaDB store failed for vector: %s", e)

        yield f"data: {json.dumps({'done': True, 'details_complete': True, 'raw_profile': raw_profile, 'behaviour_vectors': behaviour_vectors})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── ADVISOR TWIN PERSONA CHAT ────────────────────────────────────

class TwinChatMessage(BaseModel):
    role: str
    content: str

class TwinChatRequest(BaseModel):
    messages: list[TwinChatMessage]
    temperature: float = 0.5


def _get_vdb():
    """Lazy-load the behavioral vector DB (ChromaDB with fallback)."""
    try:
        from chatbot4 import BehavioralVectorDB, EMBED_AVAILABLE, CHROMA_AVAILABLE, VECTOR_DB_PATH, VECTOR_COLLECTION
        vdb_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cognivest_vectors")
        if CHROMA_AVAILABLE and EMBED_AVAILABLE and os.path.isdir(vdb_path):
            return BehavioralVectorDB(vdb_path, VECTOR_COLLECTION)
    except Exception:
        pass
    return None


def _rag_query(vdb, query_text: str, client_id: str, top_k: int = 4) -> list:
    """Query VDB for vectors belonging to client_id (stored as session_id)."""
    if vdb is None:
        return []
    from chatbot4 import EMBED_AVAILABLE
    if not EMBED_AVAILABLE:
        return []
    try:
        return vdb.query(query_text, client_id, top_k)
    except Exception:
        return []


@app.post("/api/v1/advisor/{advisor_id}/client/{client_id}/twin/stream")
def twin_persona_stream(advisor_id: str, client_id: str, req: TwinChatRequest):
    """
    Stream the client digital twin responding in-persona to an advisor's question.
    Imports chatbot4.py logic: RAG behavioral memory retrieval + persona system prompt.

    SSE events:
      data: {"token": "..."}                      — one per streamed token
      data: {"done": true, "citations": [...]}    — final, includes RAG hits
      data: {"advisor_command": true, "citations": [...], "done": true}  — for /advisor command
      data: {"error": "..."}                      — on failure
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Database not configured")

    # Fetch client twin + raw_profile
    try:
        row = supabase.table("clients") \
            .select("twin_output, raw_profile") \
            .eq("client_id", client_id) \
            .eq("advisor_id", advisor_id) \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if not row.data:
        raise HTTPException(status_code=404, detail="Client not found")

    twin_output  = row.data[0].get("twin_output") or {}
    raw_profile  = row.data[0].get("raw_profile") or {}

    # Merge behaviour_profile: twin_output takes priority
    if not raw_profile.get("behaviour_profile") and twin_output.get("behaviour_profile"):
        raw_profile["behaviour_profile"] = twin_output["behaviour_profile"]

    # Build user_data dict in the shape chatbot4 expects
    user_data = {
        "personal": {
            "name":            twin_output.get("client_summary", {}).get("name") or raw_profile.get("personal", {}).get("name", "Client"),
            "age":             twin_output.get("client_summary", {}).get("age") or raw_profile.get("personal", {}).get("age", ""),
            "city":            twin_output.get("client_summary", {}).get("city") or raw_profile.get("personal", {}).get("city", ""),
            "occupation":      twin_output.get("client_summary", {}).get("occupation") or raw_profile.get("personal", {}).get("occupation", ""),
            "monthly_income":  twin_output.get("client_summary", {}).get("monthly_income") or raw_profile.get("personal", {}).get("monthly_income", ""),
        },
        "risk_profile":      raw_profile.get("risk_profile", {}),
        "behaviour_profile": raw_profile.get("behaviour_profile", {}),
        "goals":             twin_output.get("goals") or raw_profile.get("goals", []),
    }

    # Latest user message
    messages = req.messages
    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")
    latest_user = next((m.content for m in reversed(messages) if m.role == "user"), "")

    # ── /advisor command: pure vector retrieval, no LLM ─────────────
    if latest_user.strip().lower().startswith("/advisor"):
        query = latest_user.strip()[len("/advisor"):].strip() or "behavioral patterns"

        def _advisor_gen():
            try:
                vdb = _get_vdb()
                hits = _rag_query(vdb, query, client_id, top_k=8)
                yield f"data: {json.dumps({'done': True, 'advisor_command': True, 'citations': hits})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

        return StreamingResponse(
            _advisor_gen(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # ── Normal persona chat: RAG + LLM streaming ────────────────────
    from chatbot4 import build_persona_system_prompt, build_memory_context

    temperature  = max(0.0, min(1.0, req.temperature))
    system_prompt = build_persona_system_prompt(user_data, temperature)

    # RAG: retrieve relevant behavioral memories
    vdb  = _get_vdb()
    hits = _rag_query(vdb, latest_user, client_id)

    # Build conversation for OpenRouter
    memory_ctx = build_memory_context(hits)
    api_messages = [{"role": "system", "content": system_prompt}]
    for m in messages:
        if m.role == "user" and m.content == latest_user:
            # Inject RAG context into the latest user turn only
            augmented = f"{memory_ctx}\n[ADVISOR MESSAGE]\n{latest_user}" if memory_ctx else latest_user
            api_messages.append({"role": "user", "content": augmented})
        else:
            api_messages.append({"role": m.role, "content": m.content})

    def generate():
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://cognivest.app",
                "X-Title": "CogniVest Persona Simulator",
            }
            payload = {
                "model": CHATBOT_MODEL,
                "messages": api_messages,
                "stream": True,
                "temperature": temperature,
            }
            with http_requests.post(
                OPENROUTER_URL, headers=headers, json=payload, stream=True, timeout=90
            ) as resp:
                resp.raise_for_status()
                for raw_line in resp.iter_lines():
                    if not raw_line:
                        continue
                    line_str = raw_line if isinstance(raw_line, str) else raw_line.decode("utf-8")
                    if not line_str.startswith("data: "):
                        continue
                    data_str = line_str[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0]["delta"].get("content") or ""
                        if delta:
                            yield f"data: {json.dumps({'token': delta})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        yield f"data: {json.dumps({'done': True, 'citations': hits, 'temperature': temperature})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── CLIENT EDUCATION CHAT ─────────────────────────────────────────

def _store_behavioral_vector(client_id: str, vector: dict) -> None:
    """Embed and insert one behavioral vector into ChromaDB under client_id."""
    from chatbot4 import EMBED_AVAILABLE
    if not EMBED_AVAILABLE:
        return
    import uuid
    import chromadb
    from sentence_transformers import SentenceTransformer
    document = (
        f"{vector['scenario_text']} | "
        f"{vector['client_reaction']} | "
        f"{vector['emotional_state']}"
    )
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embedding = model.encode(document).tolist()
    vdb_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cognivest_vectors")
    chroma_client = chromadb.PersistentClient(path=vdb_path)
    col = chroma_client.get_or_create_collection(
        "behavioral_vectors", metadata={"hnsw:space": "cosine"}
    )
    vector_id = f"bv_{uuid.uuid4().hex[:8]}"
    col.add(
        ids=[vector_id],
        embeddings=[embedding],
        documents=[document],
        metadatas=[{
            "session_id":      client_id,
            "scenario_text":   vector["scenario_text"],
            "client_reaction": vector["client_reaction"],
            "emotional_state": vector["emotional_state"],
            "verbatim_quote":  vector.get("verbatim_quote", ""),
            "bias_tags":       json.dumps(vector.get("bias_tags", [])),
            "intensity":       int(vector.get("intensity", 5)),
        }],
    )
    logger.info("Stored behavioral vector %s for client %s", vector_id, client_id)


_EXTRACT_PROMPT = """\
You are a behavioral finance analyst. Analyze the user message below.

If the user describes how they have reacted (or would react) to a specific financial scenario \
(e.g. market crash, portfolio drop, hot investment tip, fund underperformance), extract a JSON object:

{{
  "scenario_text": "brief neutral description of the financial scenario",
  "client_reaction": "what the client did or would do",
  "emotional_state": "single word/phrase: fearful | composed | anxious | confident | panicked | hopeful | indifferent",
  "verbatim_quote": "exact key phrase from the user message (max 120 chars)",
  "bias_tags": ["loss_aversion","panic","overconfidence","anchoring","herding","patience","recency_bias"],
  "intensity": 5
}}

intensity: 1 = very calm, 10 = extreme emotional reaction. bias_tags: include only applicable ones.

If no behavioral scenario is present, return exactly: null

User message: {user_message}

Return ONLY the JSON object or null. No markdown, no explanation.\
"""


def _extract_behavioral_vector(user_message: str) -> "dict | None":
    """
    Single non-streaming GLM-5 call to detect a behavioral financial pattern.
    Returns a vector dict or None.
    """
    if not OPENROUTER_API_KEY or not user_message.strip():
        return None
    payload = {
        "model": CHATBOT_MODEL,
        "messages": [
            {"role": "system", "content": "You are a JSON extraction assistant. Return only valid JSON or null."},
            {"role": "user", "content": _EXTRACT_PROMPT.format(user_message=user_message)},
        ],
        "temperature": 0.1,
        "max_tokens": 1500,
    }
    try:
        resp = http_requests.post(
            OPENROUTER_URL,
            headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        content = (resp.json()["choices"][0]["message"].get("content") or "").strip()
        if not content or content.lower() == "null":
            return None
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content.strip())
    except Exception as e:
        logger.warning("Behavioral extraction failed: %s", e)
        return None


_EDUCATION_SYSTEM_PROMPT = (
    "You are a financial education assistant at CogniVest, a professional portfolio management firm. "
    "You speak in a composed, precise, and respectful tone. Be concise — keep responses brief and to the point.\n\n"
    "Answer questions about stocks, bonds, ETFs, mutual funds, market trends, and general investing concepts "
    "freely and accurately.\n\n"
    "Important: Any information you provide is purely for educational purposes. It does not constitute "
    "personalised financial advice. The CogniVest advisor assigned to each client holds fiduciary duty and "
    "is the sole qualified party to give that client personalised investment recommendations. When relevant, "
    "remind the user of this distinction."
)


class ClientChatMessage(BaseModel):
    role: str
    content: str

class ClientChatRequest(BaseModel):
    messages: list[ClientChatMessage]


@app.post("/api/v1/client/{client_id}/chat/stream")
def client_chat_stream(client_id: str, req: ClientChatRequest, background_tasks: BackgroundTasks):
    """
    Stream financial-education responses for the client 'Ask CogniVest' panel.
    No RAG, no persona — pure educational assistant (chatbot6.py logic).
    After streaming, a background task runs behavioral extraction and stores any
    detected scenario-reaction vector in ChromaDB under client_id.

    SSE events:
      data: {"token": "..."}          — one per streamed token
      data: {"done": true}            — stream complete
      data: {"error": "..."}          — on failure
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OpenRouter API key not configured")

    api_messages = [{"role": "system", "content": _EDUCATION_SYSTEM_PROMPT}]
    for m in req.messages:
        api_messages.append({"role": m.role, "content": m.content})

    user_message = next((m.content for m in reversed(req.messages) if m.role == "user"), "")
    full_response: list[str] = []   # populated by generate(); read by _bg_extract

    def generate():
        try:
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://cognivest.app",
                "X-Title": "CogniVest Finance Assistant",
            }
            payload = {
                "model": CHATBOT_MODEL,
                "messages": api_messages,
                "stream": True,
            }
            with http_requests.post(
                OPENROUTER_URL, headers=headers, json=payload, stream=True, timeout=90
            ) as resp:
                resp.raise_for_status()
                for raw_line in resp.iter_lines():
                    if not raw_line:
                        continue
                    line_str = raw_line if isinstance(raw_line, str) else raw_line.decode("utf-8")
                    if not line_str.startswith("data: "):
                        continue
                    data_str = line_str[6:]
                    if data_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0]["delta"].get("content") or ""
                        if delta:
                            full_response.append(delta)
                            yield f"data: {json.dumps({'token': delta})}\n\n"
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        yield f"data: {json.dumps({'done': True})}\n\n"

    def _bg_extract():
        vector = _extract_behavioral_vector(user_message)
        if vector:
            try:
                _store_behavioral_vector(client_id, vector)
            except Exception as e:
                logger.error("Vector store failed for client %s: %s", client_id, e)

    background_tasks.add_task(_bg_extract)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── ENGINE ENDPOINTS ──────────────────────────────────────────────

class PortfolioRequest(BaseModel):
    portfolio: dict

class BehaviourRequest(BaseModel):
    portfolio: dict
    profile_override: Optional[dict] = None

class SimulateRequest(BaseModel):
    portfolio: dict
    behaviour_profile: Optional[dict] = None
    years: float = 10.0
    n_paths: int = 200

class CompareRequest(BaseModel):
    portfolio: dict
    profile_a: dict
    profile_b: dict
    years: float = 10.0
    n_paths: int = 300
    
class EngineQueryRequest(BaseModel):
    query: str
    portfolio: dict
    verbose: bool = False

@app.post("/api/v1/engine/analyse")
def analyse_full(req: PortfolioRequest):
    p = req.portfolio
    try:
        return {
            "returns": ReturnsAgent().run(p),
            "allocation": AllocationAgent().run(p),
            "risk": RiskAgent().run(p),
            "benchmark": BenchmarkAgent().run(p),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/engine/behaviour")
def get_behaviour(req: BehaviourRequest):
    try:
        agent = BehaviourAgent()
        if req.profile_override:
            profile = BehaviourProfile(**{
                k: v for k, v in req.profile_override.items()
                if k in BehaviourProfile.__dataclass_fields__
            })
        else:
            profile = agent.run(req.portfolio)
        return {
            "profile": profile.to_dict(),
            "risk_label": profile.risk_label,
            "summary": profile.raw_summary,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/engine/simulate")
def simulate(req: SimulateRequest):
    try:
        if req.behaviour_profile:
            profile = BehaviourProfile(**{
                k: v for k, v in req.behaviour_profile.items()
                if k in BehaviourProfile.__dataclass_fields__
            })
        else:
            profile = BehaviourAgent().run(req.portfolio)

        result = SimulationAgent().run(
            portfolio=req.portfolio,
            behaviour_profile=profile,
            years=req.years,
            n_paths=req.n_paths,
        )
        return {
            **result.__dict__,
            "behaviour_profile": profile.to_dict(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/engine/simulate/compare")
def simulate_compare(req: CompareRequest):
    try:
        pa = BehaviourProfile(**{k: v for k, v in req.profile_a.items()
                                  if k in BehaviourProfile.__dataclass_fields__})
        pb = BehaviourProfile(**{k: v for k, v in req.profile_b.items()
                                  if k in BehaviourProfile.__dataclass_fields__})
        result = SimulationAgent().compare_clients(
            portfolio=req.portfolio,
            profile_a=pa,
            profile_b=pb,
            years=req.years,
            n_paths=req.n_paths,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/engine/query")
def engine_query(req: EngineQueryRequest):
    try:
        answer = orchestrate(req.query, req.portfolio, verbose=req.verbose)
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Faster-Whisper transcription (mirrors voice_input.py pipeline) ────────────

_whisper_model = None
_WHISPER_AVAILABLE = False

try:
    from faster_whisper import WhisperModel as _WhisperModel
    _WHISPER_AVAILABLE = True
except ImportError:
    logger.warning("faster-whisper not installed — /api/v1/transcribe will be unavailable")

# Same config as voice_input.py
_MODEL_SIZE    = "base"
_MODEL_DEVICE  = "cpu"
_MODEL_COMPUTE = "int8"
_WHISPER_SAMPLE_RATE = 16000   # Whisper expects 16 kHz float32

def _get_whisper_model():
    global _whisper_model
    if _whisper_model is None and _WHISPER_AVAILABLE:
        logger.info("Loading Whisper '%s' model (first request)…", _MODEL_SIZE)
        _whisper_model = _WhisperModel(_MODEL_SIZE, device=_MODEL_DEVICE, compute_type=_MODEL_COMPUTE)
        logger.info("Whisper model loaded.")
    return _whisper_model

def _decode_to_float32(tmp_path: str) -> "np.ndarray":
    """
    Decode any audio file to a 16 kHz mono float32 numpy array,
    matching the exact format that voice_input.py records via sounddevice.
    Uses the `av` library (ships with faster-whisper).
    """
    import av
    import numpy as np

    container = av.open(tmp_path)
    resampler = av.AudioResampler(
        format="fltp",
        layout="mono",
        rate=_WHISPER_SAMPLE_RATE,
    )
    chunks = []
    for frame in container.decode(audio=0):
        for rf in resampler.resample(frame):
            chunks.append(rf.to_ndarray()[0])   # shape (samples,) float32
    container.close()
    if not chunks:
        return None
    import numpy as np
    return np.concatenate(chunks).astype("float32")

@app.post("/api/v1/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe uploaded audio (webm/wav/ogg/mp4) using the same
    faster-whisper pipeline as voice_input.py:
      - decode → 16 kHz float32 numpy array
      - vad_filter=True  (strips silence/noise before transcription)
      - beam_size=5, language=en
    Returns {"text": "<transcription>"}.
    """
    if not _WHISPER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Whisper not available — install faster-whisper")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    suffix = os.path.splitext(file.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Decode to 16 kHz float32 numpy array — same format as sounddevice recording
        audio_array = _decode_to_float32(tmp_path)
        if audio_array is None:
            return {"text": ""}

        model = _get_whisper_model()
        # Identical transcribe() call to voice_input.py's _transcribe()
        segments, _ = model.transcribe(
            audio_array,
            language="en",
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )
        text = " ".join(seg.text.strip() for seg in segments).strip()
        logger.info("Transcription: %r", text)
        return {"text": text}
    except Exception as e:
        logger.error("Transcription failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Transcription error: {e}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ── Market News ───────────────────────────────────────────────────────────────

@app.get("/api/v1/market-news")
async def market_news():
    """
    Returns up to 25 recent Indian financial news headlines from ET Markets,
    Moneycontrol, Business Standard, and Livemint. Cached for 15 minutes.
    """
    try:
        return fetch_market_news()
    except Exception as e:
        logger.error("market_news endpoint error: %s", e)
        return []
