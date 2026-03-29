"""
Analyser Agent — Agent 12 (runs after all other agents complete)

Computes five health-score dimensions with pure maths, then makes one LLM call
to generate priority actions, a one-line verdict, and an adviser briefing.

Output is stored at twin_output["analysis"].
"""

import json
import logging
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from llm_client import chat

logger = logging.getLogger(__name__)

WEIGHTS = {
    "portfolio":  0.20,
    "behaviour":  0.30,
    "goals":      0.25,
    "protection": 0.15,
    "tax":        0.10,
}

NIFTY_CAGR = 11.78  # % — long-run Nifty 50 CAGR reference

SYSTEM_PROMPT = (
    "You are a senior SEBI-registered financial adviser. "
    "Return ONLY valid JSON, no markdown, no preamble, no trailing text."
)

NARRATIVE_SCHEMA = """{
  "priority_actions": [
    {
      "rank": 1,
      "category": "behaviour|goals|portfolio|protection|tax",
      "title": "short action title (max 8 words)",
      "detail": "2-3 sentences explaining the action and why",
      "data_point": "specific number from the data driving this action",
      "urgency": "immediate|soon|monitor",
      "impact_inr": 0,
      "what_to_say": "direct adviser script — one sentence"
    }
  ],
  "one_line_verdict": "single sentence for client card",
  "adviser_briefing": "3-4 sentences for adviser before the call",
  "confidence": 0.82
}"""


class AnalyserAgent:

    def run(self, twin_output: dict, raw_profile: dict) -> dict:
        scores = self._compute_scores(twin_output, raw_profile)
        try:
            narrative = self._call_llm(scores, twin_output)
        except Exception as e:
            logger.warning("AnalyserAgent LLM call failed (%s: %s); using fallback.", type(e).__name__, e)
            narrative = self._fallback(scores)

        return {
            **scores,
            **narrative,
            "generated_by": "analyser_agent",
            "model": "z-ai/glm-5",
            "generated_at": datetime.utcnow().isoformat(),
        }

    # ── Health score computation (pure maths) ──────────────────────────────

    def _compute_scores(self, twin: dict, raw: dict) -> dict:
        behaviour  = self._score_behaviour(twin)
        goals      = self._score_goals(twin)
        portfolio  = self._score_portfolio(twin)
        protection = self._score_protection(twin)
        tax        = self._score_tax(twin)

        scores = {
            "portfolio":  portfolio,
            "behaviour":  behaviour,
            "goals":      goals,
            "protection": protection,
            "tax":        tax,
        }
        overall = round(sum(scores[k] * WEIGHTS[k] for k in WEIGHTS), 1)

        # biggest_risk = lowest scoring dimension
        biggest_risk = min(scores, key=scores.get)

        # biggest_opportunity heuristic
        tax_saving = twin.get("tax", {}).get("total_potential_saving_inr", 0)
        b = twin.get("behaviour_profile", {})
        sold_in_panic = b.get("sold_in_panic", False)
        behaviour_cost = b.get("behaviour_cost_10yr_inr", 0)
        if tax_saving > 50_000 and scores["tax"] < 80:
            biggest_opportunity = "tax"
        elif sold_in_panic and behaviour_cost > 500_000:
            biggest_opportunity = "behaviour"
        else:
            biggest_opportunity = biggest_risk

        return {
            "health_scores": {
                **scores,
                "overall": overall,
                "weights": WEIGHTS,
            },
            "biggest_risk":        biggest_risk,
            "biggest_opportunity": biggest_opportunity,
        }

    def _score_behaviour(self, twin: dict) -> int:
        b = twin.get("behaviour_profile", {})
        if not b:
            return 50

        loss_av  = b.get("loss_aversion", 5.0)         # 1–10, lower = better
        panic_th = abs(b.get("panic_threshold_pct", -15.0))  # larger magnitude = better
        patience = b.get("patience_score", 5.0)         # 1–10, higher = better
        sold     = b.get("sold_in_panic", False)
        check_freq = b.get("check_frequency", "weekly")  # daily/weekly/monthly
        recency  = b.get("recency_bias", 5.0)            # 1–10, lower = better

        score = 100.0
        score -= max(0, (loss_av - 5)) * 5       # each point above 5 costs 5 pts
        score -= max(0, (10 - panic_th)) * 2      # shallow panic threshold costs pts
        score += max(0, (patience - 5)) * 3       # patience above 5 gains pts
        score -= max(0, (recency - 5)) * 3        # recency bias costs pts
        if sold:
            score -= 20
        if check_freq == "daily":
            score -= 8
        elif check_freq == "weekly":
            score -= 3

        return max(0, min(100, round(score)))

    def _score_goals(self, twin: dict) -> int:
        gs = twin.get("goal_summary", {})
        if not gs:
            return 50

        overall_score = gs.get("overall_score")
        if isinstance(overall_score, (int, float)) and overall_score > 0:
            base = min(100, round(overall_score))
        else:
            base = 50

        surplus = gs.get("surplus_after_goals", 0)
        if surplus < 0:
            base = max(0, base - 15)
        elif surplus > 10_000:
            base = min(100, base + 5)

        return base

    def _score_portfolio(self, twin: dict) -> int:
        ps = twin.get("portfolio_snapshot", {})
        if not ps:
            return 50

        xirr    = ps.get("xirr_pct", 0)
        alpha   = ps.get("nifty_alpha_pp", 0)
        hhi     = ps.get("hhi_concentration", 0)
        vol     = ps.get("volatility_pct", 0)

        score = 60.0  # baseline
        # alpha vs Nifty
        score += min(20, max(-20, alpha * 2))
        # concentration penalty
        if hhi > 0.35:
            score -= 20
        elif hhi > 0.25:
            score -= 10
        # volatility penalty
        if vol > 25:
            score -= 10
        elif vol > 18:
            score -= 5
        # raw return vs Nifty CAGR
        if xirr < NIFTY_CAGR - 3:
            score -= 10
        elif xirr > NIFTY_CAGR + 3:
            score += 10

        return max(0, min(100, round(score)))

    def _score_protection(self, twin: dict) -> int:
        ins = twin.get("insurance", {})
        if not ins:
            return 30

        term = ins.get("term_life", {})
        adequacy = term.get("adequacy_score", 0)  # 0–10
        score = adequacy * 10  # 0–100

        # Will penalty
        succession = twin.get("succession", {})
        if not succession.get("has_will", False):
            score -= 20
        if not succession.get("nominees_updated", True):
            score -= 10

        # Health insurance
        health = ins.get("health_insurance", {})
        if not health.get("has_health_insurance", False):
            score -= 15

        return max(0, min(100, round(score)))

    def _score_tax(self, twin: dict) -> int:
        tax = twin.get("tax", {})
        if not tax:
            return 70  # neutral

        saving = tax.get("total_potential_saving_inr", 0)
        score  = 100.0
        score -= min(60, (saving / 10_000) * 3)  # each ₹10K unclaimed ~ -3 pts, cap at -60

        optimal  = tax.get("optimal_regime")
        current  = tax.get("current_regime")
        if optimal and current and current != optimal:
            score -= 15

        return max(0, min(100, round(score)))

    # ── LLM narrative synthesis ────────────────────────────────────────────

    def _call_llm(self, scores: dict, twin: dict) -> dict:
        hs = scores["health_scores"]
        b  = twin.get("behaviour_profile", {})
        gs = twin.get("goal_summary", {})
        ps = twin.get("portfolio_snapshot", {})
        tax = twin.get("tax", {})
        ins = twin.get("insurance", {}).get("term_life", {})

        context = {
            "health_scores": {k: v for k, v in hs.items() if k != "weights"},
            "biggest_risk": scores["biggest_risk"],
            "biggest_opportunity": scores["biggest_opportunity"],
            "behaviour": {
                "loss_aversion":        b.get("loss_aversion"),
                "panic_threshold_pct":  b.get("panic_threshold_pct"),
                "sold_in_panic":        b.get("sold_in_panic"),
                "behaviour_cost_10yr":  b.get("behaviour_cost_10yr_inr"),
                "patience_score":       b.get("patience_score"),
            },
            "goals": {
                "overall_score":      gs.get("overall_score"),
                "total_sip_gap":      gs.get("total_sip_gap"),
                "surplus_after_goals": gs.get("surplus_after_goals"),
                "overall_verdict":    gs.get("overall_verdict"),
            },
            "portfolio": {
                "xirr_pct":          ps.get("xirr_pct"),
                "nifty_alpha_pp":    ps.get("nifty_alpha_pp"),
                "hhi_concentration": ps.get("hhi_concentration"),
                "volatility_pct":    ps.get("volatility_pct"),
            },
            "tax": {
                "total_potential_saving_inr": tax.get("total_potential_saving_inr"),
                "current_regime":             tax.get("current_regime"),
                "optimal_regime":             tax.get("optimal_regime"),
            },
            "protection": {
                "adequacy_score":  ins.get("adequacy_score"),
                "coverage_gap":    ins.get("coverage_gap"),
            },
        }

        prompt = (
            f"Client financial data:\n{json.dumps(context, indent=2)}\n\n"
            f"Generate priority_actions (top 3–5), one_line_verdict, adviser_briefing, and confidence.\n"
            f"Return JSON matching this schema exactly:\n{NARRATIVE_SCHEMA}"
        )

        raw = chat(SYSTEM_PROMPT, [{"role": "user", "content": prompt}], max_tokens=1500)

        # Strip any accidental markdown fences
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)
        return {
            "priority_actions":  data.get("priority_actions", []),
            "one_line_verdict":  data.get("one_line_verdict", ""),
            "adviser_briefing":  data.get("adviser_briefing", ""),
            "confidence":        float(data.get("confidence", 0.75)),
        }

    # ── Rule-based fallback ────────────────────────────────────────────────

    def _fallback(self, scores: dict) -> dict:
        hs = scores["health_scores"]
        actions = []

        if hs.get("behaviour", 50) < 50:
            actions.append({
                "rank": 1,
                "category": "behaviour",
                "title": "Address behavioural risk",
                "detail": "Client shows high loss aversion and potential panic-selling tendencies. This behavioural pattern is the single biggest drag on long-term wealth creation.",
                "data_point": f"Behaviour score: {hs.get('behaviour')}",
                "urgency": "immediate",
                "impact_inr": 0,
                "what_to_say": "Show the client the ₹ cost of panic-selling over 10 years.",
            })
        if hs.get("protection", 50) < 50:
            actions.append({
                "rank": len(actions) + 1,
                "category": "protection",
                "title": "Fix insurance and succession gaps",
                "detail": "Significant protection shortfalls identified. Inadequate term cover and/or missing will leave the family financially exposed.",
                "data_point": f"Protection score: {hs.get('protection')}",
                "urgency": "immediate",
                "impact_inr": 0,
                "what_to_say": "Walk the client through the insurance gap in rupee terms.",
            })
        if hs.get("goals", 50) < 50:
            actions.append({
                "rank": len(actions) + 1,
                "category": "goals",
                "title": "Bridge the SIP gap",
                "detail": "Current savings rate is insufficient to meet stated goals. A higher monthly SIP or goal timeline revision is needed.",
                "data_point": f"Goals score: {hs.get('goals')}",
                "urgency": "soon",
                "impact_inr": 0,
                "what_to_say": "Present the client with the monthly SIP gap figure.",
            })

        if not actions:
            actions.append({
                "rank": 1,
                "category": "portfolio",
                "title": "Review portfolio regularly",
                "detail": "Portfolio appears broadly on track. Schedule a quarterly review to monitor drift and rebalance as needed.",
                "data_point": f"Overall score: {hs.get('overall')}",
                "urgency": "monitor",
                "impact_inr": 0,
                "what_to_say": "Confirm the client is comfortable with current allocation.",
            })

        return {
            "priority_actions":  actions,
            "one_line_verdict":  "Analysis complete — review priority actions with client.",
            "adviser_briefing":  "Automated scoring complete. LLM narrative generation failed; rule-based fallback applied. Review health scores and address the lowest-scoring dimension first.",
            "confidence":        0.55,
        }
