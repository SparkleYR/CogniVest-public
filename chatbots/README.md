<div align="center">

# CogniVest Chatbots

**Conversational AI for Client Onboarding & Advisory Simulation**

*Natural language interfaces for financial data collection and advisor-client role-play*

</div>

---

## Overview

The chatbots module provides multiple conversational AI implementations, each designed for a specific use case in the CogniVest ecosystem. From lightweight Q&A assistants to sophisticated RAG-powered persona simulators, these bots handle the human interaction layer of the platform.

---

## Chatbot Variants

### `chatbot.py` — Onboarding Bot

The foundational implementation that handles general finance Q&A and seamlessly transitions to structured data collection when personalized advice is requested.

**Capabilities:**
- Open-ended finance chat (stocks, bonds, ETFs, market concepts)
- Automatic detection of personalization triggers
- Structured collection of 6 required fields via natural conversation
- JSON extraction from unstructured dialogue

**State Management:**
- `<<ONBOARDING>>` — Marks transition from general chat to intake mode
- `<<DETAILS_COMPLETE>>` — Signals all required fields collected

**Collected Fields:**
| Field | Example |
|-------|---------|
| Full Name | "Rahul Sharma" |
| Email | "rahul@example.com" |
| Age | 34 |
| Income/Net Worth | "₹25L annual, ₹80L net worth" |
| Investment Goals | "Retirement at 55, child's education" |
| Risk Tolerance | "Moderate" |

**Use Case:** Website landing page chat widget, initial lead capture

---

### `chatbot4.py` — Client Persona Simulator (RAG)

An advanced implementation where the AI *becomes* the client. Portfolio managers interact with a simulated version of their actual client, powered by retrieval-augmented generation.

**Technical Architecture:**
```
User Query → Embedding → Vector Search (ChromaDB) → Context Injection → LLM Response
```

**Key Features:**
- **Behavioral Memory**: Past conversations and reactions stored as embeddings
- **Semantic Retrieval**: Top-k relevant memories injected into each prompt
- **Temperature Modulation**: Adjustable emotional intensity
  - Rational (0.2): Calm, logical responses
  - Balanced (0.5): Natural mix
  - Emotional (0.8): Anxious, reactive responses
- **Session Isolation**: Each client has separate vector namespace
- **Voice Input**: Optional speech-to-text integration

**Dependencies:**
```bash
pip install chromadb sentence-transformers
```

**Use Case:** Pre-meeting practice for advisors, stress-testing client reactions

---

### `chatbot5.py` — Structured Intake Bot

A comprehensive CFP-style intake system that methodically collects all data required for financial planning through guided conversation.

**Intake Sections:**

| Section | Fields Collected |
|---------|------------------|
| **A. Personal Details** | Name, age, city, occupation, family structure |
| **B. Income & Expenses** | Salary, bonuses, monthly expenses, surplus |
| **C. Financial Goals** | Retirement, education, home purchase, emergency fund |
| **D. Risk Profile** | Loss tolerance, volatility comfort, investment experience |
| **E. Existing Investments** | Stocks, mutual funds, FDs, real estate, gold |
| **F. Insurance** | Life, health, property coverage and gaps |
| **G. Liabilities** | Loans, EMIs, credit card debt |
| **H. Behavioral Tendencies** | Past reactions to market drops, decision patterns |

**Features:**
- Strict section-by-section progression
- Validation before advancing
- Session backup to JSON files
- RAG integration for behavioral context
- Voice input support

**Use Case:** Wealth management client onboarding, comprehensive financial planning

---

### `chatbot6.py` — Education Assistant

A lightweight, focused bot for financial education without data collection or personalization.

**Characteristics:**
- Clean Q&A interface
- Explicit disclaimers: *"Educational only, not personalized advice"*
- No state tracking or user data storage
- Streaming responses with typing animation

**UI Enhancements:**
- Bezier-eased character rendering
- Spinner animation during API calls
- Voice input support

**Use Case:** In-app help system, FAQ assistant for logged-in users

---

### `voice_input.py` — Voice Utilities

Shared module providing speech-to-text capabilities across all chatbots.

```python
from voice_input import voice_input, VOICE_AVAILABLE

if VOICE_AVAILABLE:
    user_text = voice_input("Speak now: ")
```

---

## Configuration

All chatbots read configuration from environment variables:

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
```

**Default Model:** `z-ai/glm-5` (configurable per implementation)

**API Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

---

## Running

```bash
# Basic onboarding
python chatbot.py

# RAG persona simulator (requires: chromadb, sentence-transformers)
python chatbot4.py

# Full structured intake
python chatbot5.py

# Education assistant
python chatbot6.py
```

---

## Architecture

```
chatbots/
├── chatbot.py       # Basic onboarding (stateless)
├── chatbot4.py      # RAG persona simulator (ChromaDB + embeddings)
├── chatbot5.py      # Full structured intake (stateful, persistent)
├── chatbot6.py      # Education assistant (stateless, streaming)
├── voice_input.py   # Shared voice utilities
└── README.md
```

---

## State Markers Reference

| Marker | Bot | Meaning |
|--------|-----|---------|
| `<<ONBOARDING>>` | chatbot.py, chatbot5.py | Transition to intake mode |
| `<<DETAILS_COMPLETE>>` | chatbot.py | Basic 6-field intake complete |
| `<<INTAKE_COMPLETE>>` | chatbot5.py | Full 8-section intake complete |

---

## API Integration

All bots call OpenRouter's chat completions endpoint:

```http
POST https://openrouter.ai/api/v1/chat/completions
Authorization: Bearer $OPENROUTER_API_KEY
Content-Type: application/json

{
  "model": "z-ai/glm-5",
  "messages": [...],
  "stream": true  // optional
}
```

Streaming is supported for real-time typing effects in `chatbot4.py` and `chatbot6.py`.

---

<div align="center">

**[← Back to Main README](../README.md)**

</div>
