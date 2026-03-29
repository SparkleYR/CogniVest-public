# CogniVest

An AI-powered behavioral digital twin platform for portfolio managers and their clients. CogniVest bridges traditional portfolio management with behavioral finance by creating a "digital twin" of an investor that mimics their real-world emotional and financial behavior.

## Core Capabilities

- **Behavioral Anticipation** — Predict how clients react to market volatility (e.g., panic selling at -15%)
- **Scenario Simulation** — Run Monte Carlo simulations comparing rational vs. behavioral outcomes over years
- **Persona-Driven AI** — Query the twin for pre-meeting practice or preference checking
- **Tax & Goal Alignment** — Automate a 360° check of goals, insurance, liabilities, and tax optimization

---

## Project Structure

```
cognivest-github/
├── chatbots/          # Conversational AI chatbot implementations
├── engine/            # FastAPI backend + multi-agent financial engine
├── website/           # React + Vite frontend
└── README.md
```

### `/chatbots`

Multiple iterations of the CogniVest conversational chatbot for client onboarding and general finance Q&A.

| File | Description |
|------|-------------|
| `chatbot.py` | Base onboarding chatbot — collects user details via natural conversation |
| `chatbot4.py` | Enhanced with RAG (vector search) for behavioral context |
| `chatbot5.py` | Full onboarding flow with session backup and extraction |
| `chatbot6.py` | Lightweight education-focused assistant |
| `voice_input.py` | Voice-to-text input utilities |

### `/engine`

The Fintwin Engine — a multi-agent system that transforms client profiles into actionable insights.

```
engine/
├── main.py              # FastAPI application + API endpoints
├── engine.py            # Background task orchestrator
├── llm_client.py        # Unified LLM interface (OpenRouter)
├── models.py            # Pydantic data models
├── agents/              # Financial analysis agents
│   ├── behaviour_agent.py         # Infers loss aversion, panic thresholds
│   ├── simulation_agent.py        # Monte Carlo GBM simulations
│   ├── returns_agent.py           # XIRR, CAGR, absolute returns
│   ├── allocation_agent.py        # Equity splits, HHI concentration
│   ├── risk_agent.py              # Volatility, VaR calculations
│   ├── benchmark_agent.py         # Alpha/Beta vs Nifty 50
│   ├── goal_projection_agent.py   # SIP gaps, goal feasibility
│   ├── insurance_tax_agent.py     # Insurance buffers, tax flags
│   ├── portfolio_construction_agent.py  # Recommended portfolio
│   ├── news_agent.py              # Market news aggregation
│   ├── analyser_agent.py          # Portfolio analysis
│   └── orchestrator.py            # Agent coordination
└── utils/               # Data loaders and helpers
```

**Key API Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/onboarding/complete` | Triggers async engine run for new client |
| `GET /api/v1/advisor/{id}/clients` | All clients for advisor dashboard |
| `GET /api/v1/advisor/{id}/client/{cid}/twin` | Full twin output JSONB |
| `POST /api/v1/advisor/{id}/client/{cid}/query` | Query twin in client's voice |
| `POST /api/v1/auth/login` | JWT authentication |
| `POST /api/v1/auth/signup/client` | Client registration |
| `POST /api/v1/auth/signup/advisor` | Advisor registration |

### `/website`

React + Vite frontend with a minimalist SaaS aesthetic for marketing and a dark command-center dashboard for advisors.

```
website/src/
├── pages/
│   ├── AdvisorDashboard.tsx      # Advisor command center
│   ├── ClientDashboard.tsx       # Client portfolio view
│   ├── ClientPortfolio.tsx       # Detailed portfolio analysis
│   ├── BehaviouralAnalysisPage.tsx
│   └── AllClientsPage.tsx
├── components/
│   ├── DeepOnboardingChat.tsx    # Onboarding conversation UI
│   ├── ChatInterface.tsx         # General chat component
│   ├── portfolio/                # Portfolio visualization components
│   ├── behaviour/                # Behavioral analysis components
│   └── ui/                       # Reusable UI primitives
├── contexts/
│   ├── AuthContext.tsx           # Global auth state
│   └── ThemeContext.tsx          # Dark/light mode
└── utils/
    ├── cognivest-api.ts          # Typed API client
    └── backendAuth.ts            # Auth utilities
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.12+, Pydantic |
| Database | Supabase (PostgreSQL) |
| LLM | OpenRouter API |
| Auth | Supabase Auth + JWT |


---

## Getting Started

### Backend

```bash
cd engine
pip install -r requirements.txt  # if requirements.txt exists
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd website
npm install
npm run dev
```

---

## License

Proprietary — All rights reserved.
