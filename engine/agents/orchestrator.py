import json
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from llm_client import chat_with_tools
from agents.returns_agent    import ReturnsAgent
from agents.allocation_agent import AllocationAgent
from agents.risk_agent       import RiskAgent
from agents.benchmark_agent  import BenchmarkAgent
from agents.behaviour_agent  import BehaviourAgent
from agents.simulation_agent import SimulationAgent
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_returns",
            "description": (
                "Calculate XIRR, CAGR, absolute return, and holding period for each scheme "
                "in the portfolio. Use for questions about performance, returns, gains."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "portfolio": {"type": "object", "description": "Full portfolio dict"}
                },
                "required": ["portfolio"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_allocation",
            "description": (
                "Calculate asset allocation %, equity cap split, sector weights, HHI, "
                "and drift from target. Use for questions about diversification, allocation, "
                "concentration, what percentage is in equity/debt/gold."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "portfolio": {"type": "object", "description": "Full portfolio dict"}
                },
                "required": ["portfolio"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_risk",
            "description": (
                "Calculate equity concentration, portfolio volatility, VaR, max drawdown, "
                "and risk flags. Use for questions about risk, safety, downside, what happens "
                "in a market crash."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "portfolio": {"type": "object", "description": "Full portfolio dict"}
                },
                "required": ["portfolio"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_benchmark",
            "description": (
                "Calculate alpha, Sharpe ratio, Sortino ratio, beta, and information ratio "
                "vs benchmark index. Use for questions about outperformance, risk-adjusted "
                "returns, how does this compare to Nifty."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "portfolio":         {"type": "object", "description": "Full portfolio dict"},
                    "benchmark_returns": {"type": "array",  "description": "Monthly benchmark returns list (optional)"},
                },
                "required": ["portfolio"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_behaviour",
            "description": (
                "Extract and score client behavioural profile: loss aversion, panic threshold, "
                "goal discipline, liquidity anxiety. Use for questions about how the client "
                "would react, their emotional patterns, or behavioural risk."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "portfolio": {"type": "object", "description": "Full portfolio dict with chat_transcript and transaction_events"},
                },
                "required": ["portfolio"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_simulation",
            "description": (
                "Run Monte Carlo simulation with behavioural overlays across all asset classes. "
                "Use for questions about future projections, goal achievement probability, "
                "panic events, NPS maturity, or what-if scenarios."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "portfolio": {"type": "object", "description": "Full portfolio dict"},
                    "n_paths":   {"type": "integer", "description": "Number of Monte Carlo paths (default 200)"},
                    "years":     {"type": "integer", "description": "Simulation horizon in years (default 10)"},
                },
                "required": ["portfolio"],
            },
        },
    },
]
SYSTEM_PROMPT = """You are a financial portfolio analysis assistant with access to specialist calculation agents.
When a user asks about a portfolio:
1. Call the relevant tool(s) to get precise numbers
2. Synthesise the results into a clear, specific answer
3. Always cite exact figures from the tool results
4. Flag any risks or anomalies you spot
5. Keep answers concise but complete — no padding

You are also building a digital twin of the client. After answering, note any behavioural signals
the portfolio data reveals (e.g. concentration bias, recency-driven decisions, STP patterns).
"""
def _run_tool(name: str, inputs: dict, portfolio: dict) -> dict:
    if name == "get_returns":
        return ReturnsAgent().run(portfolio)
    if name == "get_allocation":
        return AllocationAgent().run(portfolio)
    if name == "get_risk":
        return RiskAgent().run(portfolio)
    if name == "get_benchmark":
        return BenchmarkAgent().run(portfolio, inputs.get("benchmark_returns", []))
    if name == "get_behaviour":
        return BehaviourAgent().run(portfolio)
    if name == "run_simulation":
        return SimulationAgent().run(portfolio, inputs.get("n_paths", 200), years=inputs.get("years", 10))
    return {"error": f"Unknown tool: {name}"}
def orchestrate(query: str, portfolio: dict, verbose: bool = False) -> str:
    """
    Run the orchestrator agentic loop via GLM-5 on OpenRouter.
    Args:
        query:     Natural language question about the portfolio
        portfolio: Structured portfolio dict
        verbose:   If True, print tool calls as they happen

    Returns:
        Final synthesised answer as a string
    """
    messages = [
        {
            "role": "user",
            "content": f"Portfolio data:\n{json.dumps(portfolio, indent=2)}\n\nQuery: {query}",
        }
    ]
    max_rounds = 6
    for _ in range(max_rounds):
        msg = chat_with_tools(SYSTEM_PROMPT, messages, TOOLS)
        tool_calls = msg.get("tool_calls")
        if verbose:
            has_tools = bool(tool_calls)
            print(f"\n[Orchestrator] tool_calls={has_tools}, content_len={len(msg.get('content') or '')}")
        if not tool_calls:
            return msg.get("content") or ""
        messages.append({
            "role": "assistant",
            "content": msg.get("content"),
            "tool_calls": tool_calls,
        })
        for tc in tool_calls:
            fn_name = tc["function"]["name"]
            try:
                fn_args = json.loads(tc["function"]["arguments"])
            except (json.JSONDecodeError, KeyError):
                fn_args = {}
            if verbose:
                print(f"[Tool call] {fn_name}({list(fn_args.keys())})")
            result = _run_tool(fn_name, fn_args, portfolio)
            if verbose:
                print(f"[Tool result] {json.dumps(result)[:300]}...")
            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": json.dumps(result),
            })
    messages.append({"role": "user", "content": "Please summarise your findings in plain text now."})
    final = chat_with_tools(SYSTEM_PROMPT, messages, [])
    return final.get("content") or "Analysis complete — see tool results above."
