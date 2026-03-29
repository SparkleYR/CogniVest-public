# Goal Projection Agent
#
# For each client goal, computes:
#   - Future value of existing corpus
#   - SIP needed to reach goal
#   - Whether current SIP is sufficient
#   - Gap in ₹/month
#   - Inflation-adjusted goal amount
#   - Feasibility score 0-100
#
# All maths uses standard time-value-of-money formulas
# Return assumptions sourced from real data in reference_data.py

from dataclasses import dataclass, field
from typing import List, Optional

# ── Return assumptions (from reference_data.py real data) ─────────────────
ASSET_RETURNS = {
    "equity_aggressive": 0.14,   # aggressive equity (mid/small cap)
    "equity_moderate":   0.12,   # diversified equity (large + mid)
    "equity_conservative":0.10,  # large cap / index
    "debt":              0.07,   # corporate bond / debt MF
    "hybrid":            0.10,   # multi-asset / balanced
    "ppf":               0.071,  # PPF current rate
    "nps_e":             0.1125, # NPS Scheme E 5yr avg (real data)
    "gold":              0.08,   # conservative long-term gold
    "liquid":            0.059,  # liquid fund 1yr avg
    "fd":                0.065,  # FD approx
}

INFLATION_RATE     = 0.06   # 6% long-run inflation assumption
EMERGENCY_MONTHS   = 6      # ideal emergency fund size


@dataclass
class GoalResult:
    goal_id:              str
    goal_type:            str
    goal_label:           str
    priority:             int
    horizon_years:        float
    target_today:         float          # in today's ₹
    target_inflation_adj: float          # actual amount needed at goal date
    current_corpus:       float          # already saved for this goal
    corpus_at_goal:       float          # how much corpus grows to by goal date
    monthly_sip:          float          # current SIP for this goal
    sip_future_value:     float          # what current SIP accumulates to
    total_projected:      float          # corpus_at_goal + sip_future_value
    gap:                  float          # shortfall (0 if surplus)
    surplus:              float          # extra if over-funded
    sip_needed:           float          # SIP needed to cover full gap
    sip_gap:              float          # additional SIP needed each month
    on_track:             bool
    feasibility_score:    int            # 0-100
    feasibility_label:    str
    return_assumption:    float
    advisor_note:         str


@dataclass
class ProjectionResult:
    goals:                List[GoalResult]
    total_sip_needed:     float
    total_sip_current:    float
    total_sip_gap:        float
    monthly_surplus:      float
    surplus_after_goals:  float
    emergency_fund_status: dict
    investment_capacity:  dict
    overall_score:        int
    overall_verdict:      str
    recommended_actions:  List[dict]


class GoalProjectionAgent:

    def run(self, portfolio: dict) -> ProjectionResult:
        personal    = portfolio.get("personal", {})
        goals       = portfolio.get("goals", [])
        risk        = portfolio.get("risk_profile", {})
        liquidity   = portfolio.get("liquidity", {})
        existing    = portfolio.get("existing_portfolio", {})

        monthly_income   = personal.get("monthly_income", 0)
        monthly_expenses = personal.get("monthly_expenses", 0)
        monthly_surplus  = personal.get("monthly_surplus",
                           monthly_income - monthly_expenses)
        age              = personal.get("age", 35)
        risk_score       = risk.get("blended_risk_score", 5)

        # Emergency fund check first
        em_status = self._emergency_fund_check(
            monthly_expenses, liquidity, existing
        )

        # Project each goal
        goal_results = []
        for g in goals:
            result = self._project_goal(g, age, risk_score)
            goal_results.append(result)

        # Sort by priority
        goal_results.sort(key=lambda x: x.priority)

        total_sip_needed  = sum(r.sip_needed for r in goal_results)
        total_sip_current = sum(r.monthly_sip for r in goal_results)
        total_sip_gap     = max(0, total_sip_needed - total_sip_current)

        surplus_after_goals = monthly_surplus - total_sip_needed
        investment_capacity = self._investment_capacity(
            monthly_surplus, total_sip_needed, em_status
        )

        overall_score   = self._overall_score(goal_results, surplus_after_goals)
        overall_verdict = self._overall_verdict(overall_score, total_sip_gap)
        actions         = self._recommended_actions(
            goal_results, em_status, surplus_after_goals, total_sip_gap
        )

        return ProjectionResult(
            goals                = goal_results,
            total_sip_needed     = round(total_sip_needed),
            total_sip_current    = round(total_sip_current),
            total_sip_gap        = round(total_sip_gap),
            monthly_surplus      = round(monthly_surplus),
            surplus_after_goals  = round(surplus_after_goals),
            emergency_fund_status= em_status,
            investment_capacity  = investment_capacity,
            overall_score        = overall_score,
            overall_verdict      = overall_verdict,
            recommended_actions  = actions,
        )

    # ── Core projection ────────────────────────────────────────────────────

    def _project_goal(self, goal: dict, age: int, risk_score: float) -> GoalResult:
        goal_id      = goal.get("goal_id", "g1")
        goal_type    = goal.get("goal_type", "wealth_creation")
        goal_label   = goal.get("goal_label", goal_type)
        priority     = goal.get("priority", 3)
        target       = goal.get("target_amount", 0)
        horizon_yrs  = goal.get("horizon_years", 10)
        corpus       = goal.get("current_corpus", 0)
        monthly_sip  = goal.get("monthly_sip", 0)
        flexibility  = goal.get("flexibility", "somewhat_flexible")

        # Choose return assumption based on goal type + horizon + risk
        r_annual     = self._pick_return(goal_type, horizon_yrs, risk_score)
        r_monthly    = r_annual / 12
        n_months     = int(horizon_yrs * 12)

        # Inflation-adjust the target
        target_adj   = target * ((1 + INFLATION_RATE) ** horizon_yrs)

        # Future value of existing corpus
        corpus_fv    = corpus * ((1 + r_annual) ** horizon_yrs)

        # Future value of current SIP (annuity due)
        if r_monthly > 0 and n_months > 0:
            sip_fv   = monthly_sip * (((1 + r_monthly) ** n_months - 1) / r_monthly) * (1 + r_monthly)
        else:
            sip_fv   = monthly_sip * n_months

        total_proj   = corpus_fv + sip_fv
        gap          = max(0, target_adj - total_proj)
        surplus      = max(0, total_proj - target_adj)

        # SIP needed to fill the gap (in addition to existing SIP)
        remaining_gap = max(0, target_adj - corpus_fv)
        if r_monthly > 0 and n_months > 0:
            sip_needed = remaining_gap / (((1 + r_monthly) ** n_months - 1) / r_monthly * (1 + r_monthly))
        else:
            sip_needed = remaining_gap / max(n_months, 1)

        sip_needed   = max(0, round(sip_needed))
        sip_gap      = max(0, sip_needed - monthly_sip)
        on_track     = gap == 0

        # Feasibility score
        if target_adj > 0:
            coverage  = total_proj / target_adj
        else:
            coverage  = 1.0
        score         = min(100, int(coverage * 100))
        label, note   = self._feasibility_label(score, flexibility, sip_gap, goal_type)

        return GoalResult(
            goal_id              = goal_id,
            goal_type            = goal_type,
            goal_label           = goal_label,
            priority             = priority,
            horizon_years        = horizon_yrs,
            target_today         = round(target),
            target_inflation_adj = round(target_adj),
            current_corpus       = round(corpus),
            corpus_at_goal       = round(corpus_fv),
            monthly_sip          = round(monthly_sip),
            sip_future_value     = round(sip_fv),
            total_projected      = round(total_proj),
            gap                  = round(gap),
            surplus              = round(surplus),
            sip_needed           = sip_needed,
            sip_gap              = round(sip_gap),
            on_track             = on_track,
            feasibility_score    = score,
            feasibility_label    = label,
            return_assumption    = round(r_annual * 100, 1),
            advisor_note         = note,
        )

    # ── Return picker ──────────────────────────────────────────────────────

    def _pick_return(self, goal_type: str, horizon: float, risk: float) -> float:
        # Short horizon = conservative, long horizon = aggressive
        if horizon < 3:
            base = ASSET_RETURNS["debt"]
        elif horizon < 7:
            base = ASSET_RETURNS["hybrid"] if risk >= 5 else ASSET_RETURNS["equity_conservative"]
        else:
            if risk >= 7:
                base = ASSET_RETURNS["equity_aggressive"]
            elif risk >= 4:
                base = ASSET_RETURNS["equity_moderate"]
            else:
                base = ASSET_RETURNS["equity_conservative"]

        # Goal-type overrides
        if goal_type == "emergency_fund":
            return ASSET_RETURNS["liquid"]
        if goal_type == "retirement" and horizon > 10:
            return ASSET_RETURNS["equity_moderate"]  # always use moderate for retirement
        return base

    # ── Labels ────────────────────────────────────────────────────────────

    def _feasibility_label(self, score: int, flexibility: str,
                            sip_gap: float, goal_type: str):
        if score >= 100:
            return "On track", "Client is fully funded for this goal. Advisor can discuss next goals."
        elif score >= 85:
            gap_str = f"₹{sip_gap:,.0f}/month" if sip_gap > 0 else "minor"
            return "Nearly on track", f"Small gap of {gap_str}. {'Flexible goal — can adjust timeline.' if flexibility == 'very_flexible' else 'Suggest small SIP increase.'}"
        elif score >= 60:
            return "Moderate gap", f"Need ₹{sip_gap:,.0f}/month more. {'Timeline can be extended.' if flexibility != 'rigid' else 'Discuss increasing SIP urgently.'}"
        elif score >= 35:
            return "Significant gap", f"Serious shortfall — needs ₹{sip_gap:,.0f}/month more. {'Critical: rigid goal.' if flexibility == 'rigid' else 'Review goal or significantly increase SIP.'}"
        else:
            return "Critical gap", f"Goal is at serious risk. ₹{sip_gap:,.0f}/month gap. Immediate advisor intervention needed."

    # ── Emergency fund ─────────────────────────────────────────────────────

    def _emergency_fund_check(self, monthly_expenses: float,
                               liquidity: dict, existing: dict) -> dict:
        em_months_target = liquidity.get("emergency_fund_months", EMERGENCY_MONTHS)
        em_needed        = monthly_expenses * em_months_target
        em_current       = liquidity.get("emergency_fund_months", 0) * monthly_expenses

        # Also check liquid assets in portfolio
        liquid_assets = 0
        for asset in existing.get("assets", []):
            if asset.get("sub_type") in ("FD", "SavingsAccount", "LiquidMF", "MMF"):
                liquid_assets += asset.get("current_value", 0)

        total_liquid    = em_current + liquid_assets
        funded_months   = total_liquid / monthly_expenses if monthly_expenses > 0 else 0
        gap             = max(0, em_needed - total_liquid)

        return {
            "target_months":   em_months_target,
            "target_amount":   round(em_needed),
            "current_amount":  round(total_liquid),
            "funded_months":   round(funded_months, 1),
            "gap":             round(gap),
            "adequate":        total_liquid >= em_needed,
            "priority":        "urgent" if funded_months < 3 else "normal" if funded_months < 6 else "ok",
        }

    # ── Investment capacity ────────────────────────────────────────────────

    def _investment_capacity(self, surplus: float, total_sip_needed: float,
                              em_status: dict) -> dict:
        em_monthly = em_status["gap"] / 12 if em_status["gap"] > 0 else 0
        available  = surplus - em_monthly
        utilised   = min(available, total_sip_needed)
        remaining  = available - utilised

        return {
            "monthly_surplus":       round(surplus),
            "emergency_monthly":     round(em_monthly),
            "available_for_goals":   round(available),
            "needed_for_goals":      round(total_sip_needed),
            "remaining_uninvested":  round(remaining),
            "fully_investable":      remaining >= 0,
        }

    # ── Scoring ───────────────────────────────────────────────────────────

    def _overall_score(self, goals: List[GoalResult],
                        surplus_after: float) -> int:
        if not goals:
            return 50
        # Weighted average by priority (priority 1 = most important = 3x weight)
        total_weight = 0
        weighted_sum = 0
        for g in goals:
            weight       = max(1, 4 - g.priority)
            weighted_sum += g.feasibility_score * weight
            total_weight += weight
        score = int(weighted_sum / total_weight) if total_weight > 0 else 50
        # Bonus if has surplus after all goals
        if surplus_after > 0:
            score = min(100, score + 5)
        return score

    def _overall_verdict(self, score: int, gap: float) -> str:
        if score >= 85:
            return "Client is in strong financial shape. Goals are well-funded."
        elif score >= 65:
            return f"Client is broadly on track. A ₹{gap:,.0f}/month SIP increase would fully secure all goals."
        elif score >= 45:
            return f"Moderate concerns. ₹{gap:,.0f}/month gap across goals. Advisor should prioritise goal review."
        else:
            return f"Client needs significant course correction. ₹{gap:,.0f}/month gap. Immediate action required."

    # ── Actions ───────────────────────────────────────────────────────────

    def _recommended_actions(self, goals: List[GoalResult], em_status: dict,
                              surplus_after: float, total_gap: float) -> List[dict]:
        actions = []

        if not em_status["adequate"]:
            actions.append({
                "action":   "build_emergency_fund",
                "message":  f"Emergency fund is only {em_status['funded_months']} months. Build to 6 months (₹{em_status['gap']:,.0f}) before investing in equity.",
                "urgency":  "immediate",
                "amount":   em_status["gap"],
            })

        for g in goals:
            if g.feasibility_score < 50 and g.priority <= 2:
                actions.append({
                    "action":   f"increase_sip_{g.goal_id}",
                    "message":  f"'{g.goal_label}' needs ₹{g.sip_gap:,.0f}/month more SIP to stay on track.",
                    "urgency":  "high" if g.priority == 1 else "medium",
                    "amount":   g.sip_gap,
                })

        if surplus_after > 5000:
            actions.append({
                "action":   "invest_surplus",
                "message":  f"₹{surplus_after:,.0f}/month is unallocated. Consider investing in wealth creation fund.",
                "urgency":  "optional",
                "amount":   surplus_after,
            })

        if total_gap > 0 and len(actions) == 0:
            actions.append({
                "action":   "review_goals",
                "message":  f"Total SIP gap of ₹{total_gap:,.0f}/month. Consider extending timelines for flexible goals.",
                "urgency":  "medium",
                "amount":   total_gap,
            })

        return actions
