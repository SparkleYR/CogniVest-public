<div align="center">

# CogniVest

**AI-Powered Behavioral Digital Twin Platform for Wealth Management**

[![Python](https://img.shields.io/badge/Python-3.12+-3776ab?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript&logoColor=white)](https://typescriptlang.org)

*Bridging traditional portfolio management with behavioral finance through intelligent digital twins*

</div>

---

## Overview

CogniVest creates a **digital twin** of each investor — an AI model that captures their financial profile, risk tolerance, behavioral biases, and emotional responses to market conditions. This enables portfolio managers to:

- **Anticipate Behavior** — Predict client reactions to market volatility before they happen
- **Simulate Scenarios** — Run Monte Carlo projections comparing rational vs. behavioral outcomes
- **Practice Conversations** — Query the twin in the client's own voice for pre-meeting preparation
- **Optimize Holistically** — Automate 360° checks across goals, insurance, tax, and liabilities

---

## Project Structure

```
cognivest/
├── chatbots/          # Conversational AI for onboarding & advisory
├── engine/            # Multi-agent financial analysis backend
├── website/           # React frontend (marketing + dashboards)
└── README.md
```

### 📁 Module Documentation

Each module contains detailed documentation. Click to explore:

| Module | Description | Documentation |
|--------|-------------|---------------|
| **[`/engine`](./engine)** | FastAPI backend with 12 specialized financial agents | [`engine/README.md`](./engine/README.md) |
| **[`/chatbots`](./chatbots)** | Conversational AI bots for onboarding & simulation | [`chatbots/README.md`](./chatbots/README.md) |
| **[`/website`](./website)** | React + Vite frontend application | See structure below |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | FastAPI, Python 3.12+, Pydantic, Uvicorn |
| **Database** | Supabase (PostgreSQL), Row-Level Security |
| **LLM** | OpenRouter API (model-agnostic) |
| **Auth** | Supabase Auth, JWT tokens |
| **Vector Store** | ChromaDB (behavioral embeddings) |

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- Supabase project (for database + auth)
- OpenRouter API key

### Backend Setup

```bash
cd engine
pip install fastapi uvicorn supabase python-dotenv requests pydantic

# Configure environment
export SUPABASE_URL=your_project_url
export SUPABASE_KEY=your_service_role_key
export OPENROUTER_API_KEY=your_api_key

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd website
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` and proxies API calls to `http://localhost:8000`.

---

## Architecture Highlights

### Multi-Agent Engine

The backend orchestrates **12 specialized agents** that transform raw client profiles into actionable insights:

- **Behavior Agent** — Infers loss aversion, panic thresholds via LLM + heuristics
- **Simulation Agent** — Monte Carlo GBM with behavioral drift modeling
- **Returns/Risk/Allocation Agents** — Core portfolio analytics
- **Goal Projection Agent** — SIP gaps, feasibility scoring
- **Insurance & Tax Agent** — Coverage gaps, optimization flags

### Conversational AI

Multiple chatbot implementations for different use cases:

- **Onboarding Bot** — Structured client intake via natural conversation
- **Persona Simulator** — RAG-powered bot that *becomes* the client for advisor practice
- **Education Assistant** — General finance Q&A without personalization

---

## API Overview

| Category | Key Endpoints |
|----------|---------------|
| **Auth** | `POST /auth/login`, `POST /auth/signup/client`, `POST /auth/signup/advisor` |
| **Advisor** | `GET /advisor/{id}/clients`, `GET /advisor/{id}/client/{cid}/twin` |
| **Engine** | `POST /onboarding/complete`, `POST /engine/simulate`, `POST /engine/behaviour` |
| **Chat** | `POST /onboarding/chat`, `POST /ask-cognivest` |
| **Data** | `GET /market-news` |

Full API documentation available at `/docs` when the server is running.

---

## License

Proprietary — All rights reserved.

---

<div align="center">

**[Engine Docs](./engine/README.md)** · **[Chatbot Docs](./chatbots/README.md)** · **[API Reference](http://localhost:8000/docs)**

</div>
