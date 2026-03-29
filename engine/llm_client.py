import os, json, requests
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

# We'll default to Claude 3 Haiku for the agents since it's fast and smart.
OPENROUTER_MODEL = "z-ai/glm-5"

def is_configured() -> bool:
    return bool(OPENROUTER_KEY)

def provider_name() -> str:
    return "OpenRouter"

def get_model() -> str:
    return OPENROUTER_MODEL

def chat(system: str, messages: list, max_tokens: int = 800) -> str:
    """
    Unified chat call using OpenRouter. Returns the assistant text response.
    """
    # Convert Anthropic message format to OpenAI format
    oai_messages = [{"role": "system", "content": system}]
    for m in messages:
        oai_messages.append({"role": m["role"], "content": m["content"]})

    resp = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://fintwin.app",
            "X-Title": "Fintwin Digital Twin",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": oai_messages,
            "max_tokens": max_tokens,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()

# Legacy compatibility — some agents call get_client() directly.
# They assume they are getting an Anthropic client.
class _FakeClient:
    """Wraps our unified chat() so old agent code still works."""
    class messages:
        @staticmethod
        def create(model, max_tokens, system, messages, **kwargs):
            class _Resp:
                class _Content:
                    text = ""
                content = [_Content()]
            r = _Resp()
            r.content[0].text = chat(system, messages, max_tokens)
            return r

def get_client():
    return _FakeClient()


def chat_with_tools(system: str, messages: list, tools: list, max_tokens: int = 2000) -> dict:
    """
    Call OpenRouter with OpenAI-format tool definitions.
    Returns the full message dict from choices[0]["message"].
    Keys: "content" (str|None), "tool_calls" (list|None).
    Raises requests.HTTPError on failure.
    """
    oai_messages = [{"role": "system", "content": system}] + messages
    resp = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENROUTER_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://fintwin.app",
            "X-Title": "Fintwin Digital Twin",
        },
        json={
            "model": OPENROUTER_MODEL,
            "messages": oai_messages,
            "tools": tools,
            "tool_choice": "auto",
            "max_tokens": max_tokens,
        },
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]
