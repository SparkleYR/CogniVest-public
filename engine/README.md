<div align="center">

# Fintwin Engine

**Multi-Agent Financial Analysis System**

*Transforms client profiles into actionable investment insights through specialized AI agents*

</div>

---

## Overview

The Fintwin Engine is the analytical backbone of CogniVest. It orchestrates **12 specialized agents** that collectively analyze a client's financial profile, behavioral tendencies, and market conditions to generate comprehensive investment recommendations.

Built on **FastAPI** for high-performance async processing, the engine supports both synchronous analysis and background task execution for computationally intensive simulations.

---

## Architecture

```
engine/
├── main.py              # FastAPI application (1,600+ lines, 40+ endpoints)
├── engine.py            # Background task orchestrator
├── llm_client.py        # Unified LLM interface via OpenRouter
├── models.py            # Pydantic schemas for type-safe data contracts
├── agents/              # Specialized financial analysis agents
│   ├── behaviour_agent.py
│   ├── simulation_agent.py
│   ├── returns_agent.py
│   ├── allocation_agent.py
│   ├── risk_agent.py
│   ├── benchmark_agent.py
│   ├── goal_projection_agent.py
│   ├── insurance_tax_agent.py
│   ├── portfolio_construction_agent.py
│   ├── news_agent.py
│   ├── analyser_agent.py
│   └── orchestrator.py
└── utils/               # Data loaders, parsers, and helpers
```

---

## Agent Pipeline

Each agent is a self-contained module with a single responsibility. The orchestrator coordinates execution order and data flow.

| Agent | Responsibility | Output |
|-------|----------------|--------|
| **Behaviour Agent** | Infers loss aversion, panic thresholds, and cognitive biases from profile data using LLM reasoning + quantitative heuristics | `BehaviourProfile` with panic_threshold_pct, loss_aversion_score, bias_flags |
| **Simulation Agent** | Runs Monte Carlo GBM simulations (10,000 paths) comparing a rational baseline against the client's behavioral profile | Wealth gap quantification, percentile outcomes, behavioral cost over 10/20/30 years |
| **Returns Agent** | Calculates XIRR, CAGR, absolute returns, and time-weighted performance from transaction history | Annualized returns, benchmark-relative performance |
| **Allocation Agent** | Analyzes asset allocation: equity/debt split, market-cap distribution, sector concentration (HHI index) | Current vs. recommended allocation, concentration flags |
| **Risk Agent** | Computes portfolio volatility, Value-at-Risk (95%), max drawdown, Sharpe ratio | Risk metrics with thresholds and warnings |
| **Benchmark Agent** | Measures alpha and beta against Nifty 50 and relevant category benchmarks | Excess returns, systematic risk exposure |
| **Goal Projection Agent** | Projects goal feasibility given current SIP, corpus, and expected returns | SIP gap, probability of success, required adjustments |
| **Insurance & Tax Agent** | Identifies coverage gaps (life, health, property) and tax optimization opportunities | Action items for insurance, 80C/80D recommendations |
| **Portfolio Construction Agent** | Generates a recommended portfolio based on risk profile, goals, and constraints | Target allocation with specific fund/stock suggestions |
| **News Agent** | Aggregates real-time market headlines from ET Markets, Moneycontrol, Business Standard, Livemint | 25 latest headlines with source attribution (15-min cache) |
| **Analyser Agent** | Performs deep portfolio analysis including style attribution and factor exposure | Detailed analytics for advisor review |
| **Orchestrator** | Coordinates agent execution, manages dependencies, aggregates results | Unified `twin_output` JSONB |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/signup/client` | Register a new client account |
| `POST` | `/api/v1/auth/signup/advisor` | Register a new advisor account |
| `POST` | `/api/v1/auth/login` | Authenticate and receive JWT tokens |
| `GET` | `/api/v1/auth/me` | Retrieve current user profile |

### Advisor Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/advisor/{advisor_id}/clients` | List all clients with dashboard metrics (AUM, goal score, flags) |
| `GET` | `/api/v1/advisor/{advisor_id}/client/{client_id}/twin` | Full `twin_output` JSONB for deep dive |
| `POST` | `/api/v1/advisor/{advisor_id}/client/{client_id}/query` | Query the twin in the client's voice |

### Engine Execution

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/onboarding/complete` | Trigger async engine run for newly onboarded client |
| `POST` | `/api/v1/engine/analyse` | Run portfolio analysis agents |
| `POST` | `/api/v1/engine/behaviour` | Extract behavioral profile from raw data |
| `POST` | `/api/v1/engine/simulate` | Execute Monte Carlo simulation |
| `POST` | `/api/v1/engine/simulate/compare` | Compare rational vs. behavioral paths |

### Conversational

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/onboarding/chat` | Stateful onboarding conversation |
| `POST` | `/api/v1/deep-onboarding/chat` | Structured intake conversation |
| `POST` | `/api/v1/ask-cognivest` | Client Q&A with portfolio context |

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/market-news` | Latest 25 Indian financial headlines (cached 15 min) |

---

## Data Models

The engine uses a comprehensive `RawProfile` schema (defined in `models.py`) containing:

```
RawProfile
├── meta                 # client_id, session tracking, consent
├── personal_details     # name, age, income, expenses, family structure
├── goals[]              # target amounts, horizons, priorities
├── risk_profile         # stated vs. revealed scores, loss tolerance
├── liquidity            # emergency fund, lock-in comfort
├── holdings[]           # current portfolio positions
├── insurance_needs      # life, health, property coverage
└── behavioural_indicators  # past reactions, self-reported biases
```

Output is stored as `twin_output` JSONB in Supabase, hydrating the frontend dashboards.

---

## Environment Configuration

```bash
# Required
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_KEY=your_service_role_key
export OPENROUTER_API_KEY=sk-or-v1-...

# Optional
export LOG_LEVEL=INFO
```

---

## Running the Engine

```bash
# Install dependencies
pip install fastapi uvicorn supabase python-dotenv requests pydantic

# Development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Interactive API documentation available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Database Schema

The engine reads from and writes to Supabase PostgreSQL:

| Table | Purpose |
|-------|---------|
| `clients` | Primary store: `raw_profile` (input JSONB), `twin_output` (computed JSONB) |
| `advisors` | Advisor accounts, firm associations |
| `engine_runs` | Execution logs with timestamps and agent completion status |
| `portfolio_history` | Historical snapshots for performance charts |

---

## LLM Integration

All LLM calls route through `llm_client.py`, which provides:

- **Model Abstraction** — Swap models without code changes
- **Unified Error Handling** — Retries, timeouts, fallbacks
- **Cost Visibility** — All calls tracked via OpenRouter dashboard

Default model: `z-ai/glm-5` (configurable)

---

<div align="center">

**[← Back to Main README](../README.md)**

</div>
