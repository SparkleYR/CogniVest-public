# Behaviour Agent
#
# Two modes:
#   extract_from_conversation(messages) -- post-onboarding chatbot
#   run(portfolio)                      -- infer from portfolio history alone
#
# Output: BehaviourProfile -- makes Client A and Client B different
# despite identical portfolios

import json
import logging
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from llm_client import get_client, get_model
from dataclasses import dataclass, field, asdict


@dataclass
class BehaviourProfile:
    loss_aversion:        float = 5.0
    panic_threshold_pct:  float = -15.0
    recency_bias:         float = 5.0
    overconfidence:       float = 5.0
    anchoring_strength:   float = 5.0
    herding_tendency:     float = 5.0
    patience_score:       float = 5.0
    primary_goal:         str   = "wealth accumulation"
    goal_horizon_years:   float = 10.0
    goal_confidence:      float = 0.5
    anxiety_triggers:     list  = field(default_factory=list)
    positive_signals:     list  = field(default_factory=list)
    key_quotes:           list  = field(default_factory=list)
    source:               str   = "portfolio_inference"
    confidence:           float = 0.50
    raw_summary:          str   = ""

    def to_dict(self): return asdict(self)

    @property
    def risk_label(self) -> str:
        if self.loss_aversion >= 7 or self.panic_threshold_pct > -10:
            return "conservative"
        if self.loss_aversion <= 3 and self.patience_score >= 7:
            return "aggressive"
        return "moderate"

    @property
    def panic_multiplier(self) -> float:
        return max(1.0, self.loss_aversion / 5.0 * 2.0)


EXTRACT_SYS = """You are a behavioural finance analyst. Extract a structured profile from this client conversation.
Return ONLY valid JSON, no markdown. Schema:
{"loss_aversion":5.0,"panic_threshold_pct":-15.0,"recency_bias":5.0,"overconfidence":5.0,
"anchoring_strength":5.0,"herding_tendency":5.0,"patience_score":5.0,
"primary_goal":"string","goal_horizon_years":10.0,"goal_confidence":0.5,
"anxiety_triggers":[],"positive_signals":[],"key_quotes":[],"raw_summary":"string"}
Scores 1-10, 5=average. panic_threshold_pct is negative (e.g. -14 means acts at -14% drawdown).
patience_score 10=very patient. loss_aversion 8+=high fear of loss."""

INFER_SYS = """You are a behavioural finance analyst. Infer a client's behavioural profile from portfolio signals.
Return ONLY valid JSON with the same schema. source="portfolio_inference"."""


class BehaviourAgent:

    def __init__(self):
        self._client = None
        self._model = get_model()

    def _api(self):
        if not self._client:
            self._client = get_client()
        return self._client

    def extract_from_conversation(self, messages: list) -> BehaviourProfile:
        """Extract profile from onboarding chatbot conversation."""
        text = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in messages)
        try:
            from llm_client import chat
            reply = chat(EXTRACT_SYS, [{"role": "user", "content": f"Client conversation:\n\n{text}"}], max_tokens=800)
            data = json.loads(reply)
            data["source"] = "chatbot"
            data["confidence"] = 0.82
            return BehaviourProfile(**{k: v for k, v in data.items()
                                       if k in BehaviourProfile.__dataclass_fields__})
        except Exception as e:
            return BehaviourProfile(source="chatbot_error", confidence=0.20,
                                    raw_summary=str(e))

    def run(self, portfolio: dict) -> BehaviourProfile:
        """Infer profile from portfolio data. Returns existing profile if present."""
        existing = portfolio.get("behaviour_profile")
        if existing:
            return BehaviourProfile(**existing)

        signals = self._signals(portfolio)
        try:
            from llm_client import chat
            reply = chat(INFER_SYS, [{"role": "user", "content": f"Portfolio signals:\n{json.dumps(signals, indent=2)}"}], max_tokens=800)
            data = json.loads(reply)
            data["source"] = "portfolio_inference"
            data["confidence"] = 0.55
            return BehaviourProfile(**{k: v for k, v in data.items()
                                       if k in BehaviourProfile.__dataclass_fields__})
        except Exception as e:
            logging.warning("BehaviourAgent LLM inference failed (%s: %s); falling back to heuristic.", type(e).__name__, e)
            profile = self._heuristic(signals)
            profile.raw_summary = f"LLM inference failed ({type(e).__name__}: {e}). {profile.raw_summary}"
            return profile

    def _signals(self, portfolio: dict) -> dict:
        schemes  = portfolio.get("schemes", []) + portfolio.get("assets", [])
        reported = portfolio.get("reported", {})
        total_cv = sum(s.get("current_value", 0) for s in schemes)
        top_cv   = max((s.get("current_value", 0) for s in schemes), default=0)
        return {
            "tenure_years":         round(reported.get("tenure_years", 5), 1),
            "xirr_pct":             reported.get("xirr_pct", 0),
            "short_term_count":     sum(1 for s in schemes if s.get("holding_days", 999) < 365),
            "long_term_count":      sum(1 for s in schemes if s.get("holding_days", 0) >= 1000),
            "top_concentration":    round(top_cv / total_cv, 2) if total_cv > 0 else 0,
            "has_debt":             any("Debt" in s.get("asset_class","") for s in schemes),
            "has_gold":             any("Gold" in s.get("asset_class","") for s in schemes),
            "has_guaranteed":       any(s.get("sub_type") in ("PPF","RBIBond","FD") for s in schemes),
            "total_redeemed":       reported.get("total_redeemed", 0),
            "scheme_count":         len(schemes),
            "stp_stopped":          portfolio.get("stp_stopped", False),
        }

    def _heuristic(self, signals: dict) -> BehaviourProfile:
        tenure   = signals.get("tenure_years", 5)
        patience = min(10, 3 + tenure * 0.4)
        loss_av  = round(7 - patience * 0.3, 1)
        return BehaviourProfile(
            loss_aversion       = loss_av,
            panic_threshold_pct = -15.0,
            patience_score      = round(patience, 1),
            overconfidence      = 6.0 if signals.get("top_concentration", 0) > 0.35 else 4.0,
            source              = "heuristic",
            confidence          = 0.35,
            raw_summary         = f"Inferred: {tenure:.0f}yr tenure, {signals.get('xirr_pct',0):.1f}% XIRR.",
        )
