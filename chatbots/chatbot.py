import json
import re
import os
import requests

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

OPENROUTER_API_KEY = ""
MODEL = "z-ai/glm-5" # swap to any OpenRouter model you like
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

FREE_CHAT = "free_chat"
ONBOARDING = "onboarding"

SYSTEM_PROMPT = """You are a knowledgeable finance assistant for CogniVest, a company specializing in portfolio management.

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

FIELD_LABELS = {
    "name": "Full Name",
    "email": "Email",
    "age": "Age / DOB",
    "income_net_worth": "Income / Net Worth",
    "investment_goals": "Investment Goals",
    "risk_tolerance": "Risk Tolerance",
}

FIELD_ORDER = list(FIELD_LABELS.keys())
REQUIRED_FIELDS = FIELD_ORDER


# ---------------------------------------------------------------------------
# OpenRouter API helper
# ---------------------------------------------------------------------------

def call_openrouter(messages: list) -> str:
    """Send messages to OpenRouter and return the assistant reply text."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://cognivest.app",   # shown in OpenRouter dashboard
        "X-Title": "CogniVest Finance Assistant",
    }
    payload = {
        "model": MODEL,
        "messages": messages,
    }
    response = requests.post(OPENROUTER_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"] or ""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_json(text: str) -> dict:
    """Parse JSON from model output, tolerating markdown code fences."""
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
    """Run a separate extraction call to pull structured details from the chat."""
    extraction_messages = messages + [
        {"role": "user", "content": EXTRACTION_PROMPT}
    ]
    raw = call_openrouter(extraction_messages)
    details = extract_json(raw)
    for key in FIELD_ORDER:
        details.setdefault(key, "")
    return details


def all_fields_present(details: dict) -> bool:
    return all(details.get(field, "").strip() for field in REQUIRED_FIELDS)


def clean_response(text: str) -> str:
    text = text.replace("<<ONBOARDING>>", "")
    text = text.replace("<<DETAILS_COMPLETE>>", "")
    return text.strip()


# ---------------------------------------------------------------------------
# Review & edit UI
# ---------------------------------------------------------------------------

def run_review_and_edit(details: dict) -> dict:
    for key in FIELD_ORDER:
        details.setdefault(key, "")

    while True:
        print("\n" + "=" * 52)
        print("       Your CogniVest Account Details")
        print("=" * 52)
        for i, key in enumerate(FIELD_ORDER, 1):
            print(f"  {i}. {FIELD_LABELS[key]:<22} {details[key]}")
        print("=" * 52)

        choice = input(
            "\nEnter a field number to edit, or press Enter to confirm: "
        ).strip()

        if choice == "":
            break

        if choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(FIELD_ORDER):
                key = FIELD_ORDER[idx]
                new_val = input(
                    f"  New {FIELD_LABELS[key]} [{details[key]}]: "
                ).strip()
                if new_val:
                    details[key] = new_val
                continue

        print("  Invalid — enter a number between 1 and 6, or press Enter.")

    return details


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def save_to_json(details: dict, path: str = "user_data.json") -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(details, f, indent=2)


# ---------------------------------------------------------------------------
# Main chat loop
# ---------------------------------------------------------------------------

def chat() -> None:
    print("\n" + "=" * 52)
    print("    Welcome to CogniVest Finance Assistant")
    print("=" * 52)
    print("  Ask me anything about finance and investing.")
    print("  Type 'quit' or 'exit' to leave.\n")

    if OPENROUTER_API_KEY == "your-openrouter-api-key-here":
        print("⚠  WARNING: OPENROUTER_API_KEY is not set.")
        print("   Set it via:  set OPENROUTER_API_KEY=sk-or-...\n")

    state = FREE_CHAT
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n\nGoodbye!")
            break

        if not user_input or user_input.lower() in ("quit", "exit"):
            print("\nGoodbye!")
            break

        messages.append({"role": "user", "content": user_input})

        try:
            content = call_openrouter(messages)
        except requests.HTTPError as e:
            print(f"\n[API error: {e}]\n")
            messages.pop()   # remove the user message so history stays clean
            continue

        messages.append({"role": "assistant", "content": content})

        # Detect state transitions
        if state == FREE_CHAT and "<<ONBOARDING>>" in content:
            state = ONBOARDING

        details_complete = "<<DETAILS_COMPLETE>>" in content

        # Print response without markers
        display = clean_response(content)
        if display:
            print(f"\nCogniVest: {display}\n")

        # Once the model signals all details are in, extract and review
        if details_complete and state == ONBOARDING:
            print("[Extracting your details from the conversation...]\n")
            user_details = extract_user_details(messages)

            if not all_fields_present(user_details):
                missing = [
                    FIELD_LABELS[f]
                    for f in REQUIRED_FIELDS
                    if not user_details.get(f, "").strip()
                ]
                print(f"[Missing fields detected: {', '.join(missing)} — continuing collection...]\n")
                continue

            user_details = run_review_and_edit(user_details)
            save_to_json(user_details)
            print(
                "\n✓ Details saved to user_data.json"
                "\n  A CogniVest advisor will be in touch shortly.\n"
            )
            break


if __name__ == "__main__":
    chat()
