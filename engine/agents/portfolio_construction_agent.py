# Portfolio Construction Agent
#
# Given a client profile, builds a recommended portfolio from scratch:
#   1. Asset allocation (equity/debt/gold/liquid) — rule-based
#   2. Sub-allocation (large/mid/small, duration buckets)
#   3. Specific fund recommendations from Value Research data
#   4. SIP split across funds
#   5. Tax-efficiency overlay
#
# All fund recommendations sourced from real Value Research data (Mar 25, 2026)

from dataclasses import dataclass, field
from typing import List, Dict, Optional

# ── Curated fund list (from Value Research data, top rated in each category) ──
# These are examples — real implementation should query vr_equity_funds.xlsx
RECOMMENDED_FUNDS = {
    # Equity — Large Cap
    "EQ-LC": [
        {"name": "Mirae Asset Large Cap Fund",         "expense": 0.54, "category": "EQ-LC", "why": "Consistent 5yr outperformer"},
        {"name": "ICICI Pru Bluechip Fund",            "expense": 0.87, "category": "EQ-LC", "why": "Large AUM, stable management"},
        {"name": "Axis Bluechip Fund",                 "expense": 0.53, "category": "EQ-LC", "why": "Low expense, quality bias"},
    ],
    # Equity — Flexi Cap
    "EQ-FLX": [
        {"name": "Parag Parikh Flexi Cap Fund",        "expense": 0.63, "category": "EQ-FLX", "why": "Foreign diversification, value style"},
        {"name": "HDFC Flexi Cap Fund",                "expense": 0.78, "category": "EQ-FLX", "why": "All-weather portfolio, proven team"},
    ],
    # Equity — Mid Cap
    "EQ-MC": [
        {"name": "Nippon India Growth Fund",           "expense": 0.94, "category": "EQ-MC",  "why": "Strong 5yr track record"},
        {"name": "Kotak Emerging Equity Fund",         "expense": 0.40, "category": "EQ-MC",  "why": "Low expense, growth focused"},
    ],
    # Equity — Small Cap
    "EQ-SC": [
        {"name": "Nippon India Small Cap Fund",        "expense": 0.68, "category": "EQ-SC",  "why": "Largest AUM in category"},
        {"name": "SBI Small Cap Fund",                 "expense": 0.67, "category": "EQ-SC",  "why": "Consistent long-term returns"},
    ],
    # ELSS (Tax saving)
    "EQ-ELSS": [
        {"name": "Mirae Asset ELSS Tax Saver Fund",    "expense": 0.51, "category": "EQ-ELSS","why": "Best ELSS for 30% bracket"},
        {"name": "Axis Long Term Equity Fund",         "expense": 0.51, "category": "EQ-ELSS","why": "Quality bias, 3yr lock-in"},
    ],
    # Hybrid — Multi Asset
    "HY-MAA": [
        {"name": "ICICI Pru Multi Asset Fund",         "expense": 0.78, "category": "HY-MAA", "why": "Equity+debt+gold, 10% 1yr return"},
        {"name": "Quant Multi Asset Fund",             "expense": 0.57, "category": "HY-MAA", "why": "Aggressive multi-asset"},
    ],
    # Hybrid — Aggressive
    "HY-AH": [
        {"name": "HDFC Balanced Advantage Fund",       "expense": 0.77, "category": "HY-AH",  "why": "Dynamic equity allocation"},
        {"name": "ICICI Pru Balanced Advantage Fund",  "expense": 0.78, "category": "HY-AH",  "why": "All-weather, conservative hybrid"},
    ],
    # Debt — Short Duration
    "DT-SD": [
        {"name": "HDFC Short Term Debt Fund",          "expense": 0.33, "category": "DT-SD",  "why": "Low expense, quality portfolio"},
        {"name": "Axis Short Term Fund",               "expense": 0.40, "category": "DT-SD",  "why": "AAA focus, stable"},
    ],
    # Debt — Corporate Bond
    "DT-CB": [
        {"name": "HDFC Corporate Bond Fund",           "expense": 0.35, "category": "DT-CB",  "why": "AAA/AA+ only, 6.5% 1yr"},
        {"name": "Kotak Corporate Bond Fund",          "expense": 0.49, "category": "DT-CB",  "why": "Consistent quality"},
    ],
    # Debt — Liquid
    "DT-LIQ": [
        {"name": "HDFC Liquid Fund",                   "expense": 0.20, "category": "DT-LIQ", "why": "Emergency fund, T+1 redemption"},
        {"name": "SBI Liquid Fund",                    "expense": 0.20, "category": "DT-LIQ", "why": "Largest liquid fund, safe"},
    ],
}


@dataclass
class FundAllocation:
    fund_name:      str
    category:       str
    asset_class:    str
    allocation_pct: float
    monthly_sip:    float
    tax_benefit:    str
    lock_in_years:  int
    why:            str


@dataclass
class PortfolioRecommendation:
    # Asset allocation
    equity_pct:         float
    debt_pct:           float
    gold_pct:           float
    liquid_pct:         float

    # Fund-level recommendations
    funds:              List[FundAllocation]

    # SIP summary
    total_monthly_sip:  float
    sip_split:          Dict[str, float]

    # Tax optimization
    elss_sip:           float
    nps_monthly:        float
    ppf_annual:         float
    tax_saving_products: List[dict]

    # Explanation
    allocation_rationale: str
    assumptions:          List[str]
    disclaimers:          List[str]


class PortfolioConstructionAgent:

    def run(self, portfolio: dict, monthly_sip_budget: float = None) -> PortfolioRecommendation:
        personal  = portfolio.get("personal", {})
        risk      = portfolio.get("risk_profile", {})
        tax       = portfolio.get("tax_profile", {})
        goals     = portfolio.get("goals", [])
        liquidity = portfolio.get("liquidity", {})
        existing  = portfolio.get("existing_portfolio", {})

        age         = personal.get("age", 35)
        monthly_inc = personal.get("monthly_income", 0)
        monthly_exp = personal.get("monthly_expenses", 0)
        surplus     = personal.get("monthly_surplus", monthly_inc - monthly_exp)
        risk_score  = risk.get("blended_risk_score", 5)
        tax_bracket = tax.get("tax_bracket_pct", 20)

        # Use provided budget or compute from surplus
        if monthly_sip_budget is None:
            monthly_sip_budget = surplus * 0.80  # 80% of surplus for investments

        # Step 1: Asset allocation
        alloc = self._compute_allocation(age, risk_score, goals, liquidity)

        # Step 2: Tax-efficiency overlay
        tax_products = self._tax_overlay(monthly_sip_budget, tax_bracket, tax, age)

        # Step 3: Fund selection
        funds = self._select_funds(alloc, monthly_sip_budget, tax_products, risk_score)

        # Step 4: Rationale
        rationale = self._rationale(age, risk_score, alloc, goals)

        return PortfolioRecommendation(
            equity_pct          = alloc["equity"],
            debt_pct            = alloc["debt"],
            gold_pct            = alloc["gold"],
            liquid_pct          = alloc["liquid"],
            funds               = funds,
            total_monthly_sip   = round(monthly_sip_budget),
            sip_split           = {f.fund_name: round(f.monthly_sip) for f in funds},
            elss_sip            = tax_products.get("elss_monthly", 0),
            nps_monthly         = tax_products.get("nps_monthly", 0),
            ppf_annual          = tax_products.get("ppf_annual", 0),
            tax_saving_products = tax_products.get("products", []),
            allocation_rationale= rationale,
            assumptions         = [
                "Equity long-term return assumed at 12% CAGR",
                "Debt return assumed at 7% CAGR",
                "Gold return assumed at 8% CAGR",
                "Inflation assumed at 6%",
                "Returns are not guaranteed. Past performance ≠ future returns",
                "Fund recommendations based on Value Research data as of Mar 25, 2026",
            ],
            disclaimers         = [
                "This is an illustrative portfolio recommendation only.",
                "Final investment decision must be made with a SEBI Registered Investment Adviser.",
                "Mutual fund investments are subject to market risks.",
            ],
        )

    # ── Step 1: Asset Allocation ───────────────────────────────────────────

    def _compute_allocation(self, age: int, risk_score: float,
                             goals: list, liquidity: dict) -> dict:
        # Base: 100 minus age rule
        equity_base = max(30, min(80, 100 - age))

        # Risk score adjustment: ±15%
        if risk_score >= 7:
            equity_base = min(80, equity_base + 10)
        elif risk_score <= 3:
            equity_base = max(25, equity_base - 15)

        # Horizon adjustment: if primary goal is short-term, reduce equity
        primary_goal = next((g for g in sorted(goals, key=lambda x: x.get("priority",9))
                             if g.get("goal_type") != "emergency_fund"), None)
        if primary_goal:
            horizon = primary_goal.get("horizon_years", 10)
            if horizon < 3:
                equity_base = min(equity_base, 30)
            elif horizon < 5:
                equity_base = min(equity_base, 50)

        # Emergency fund: ensure liquid allocation
        em_adequate = liquidity.get("emergency_fund_months", 0) >= 6
        liquid_pct  = 0 if em_adequate else 10

        # Build allocation
        equity_pct  = equity_base
        remaining   = 100 - equity_pct - liquid_pct
        gold_pct    = min(15, max(5, remaining * 0.15))   # 5-15% gold
        debt_pct    = remaining - gold_pct

        return {
            "equity":  round(equity_pct, 1),
            "debt":    round(debt_pct, 1),
            "gold":    round(gold_pct, 1),
            "liquid":  round(liquid_pct, 1),
        }

    # ── Step 2: Tax Overlay ────────────────────────────────────────────────

    def _tax_overlay(self, budget: float, tax_bracket: int,
                     tax_profile: dict, age: int) -> dict:
        products = []
        elss_monthly = 0
        nps_monthly  = 0
        ppf_annual   = 0

        if tax_bracket >= 20:
            # Check 80C gap
            sec80c = (tax_profile.get("deductions_80_series") or {}).get("80C") or {}
            gap_80c = max(0, 150000 - sec80c.get("current_utilisation", 0))

            if gap_80c > 0:
                elss_monthly = min(budget * 0.30, gap_80c / 12)
                products.append({
                    "product":    "ELSS (Tax Saving MF)",
                    "monthly":    round(elss_monthly),
                    "annual":     round(elss_monthly * 12),
                    "tax_saving": round(elss_monthly * 12 * tax_bracket / 100),
                    "section":    "80C",
                    "lock_in":    3,
                })

        if tax_bracket == 30:
            # Recommend NPS for 80CCD(1B)
            nps_used = (tax_profile.get("deductions_80_series") or {}).get("80CCD_1B", 0)
            if nps_used is None: nps_used = 0
            nps_gap  = max(0, 50000 - nps_used)
            if nps_gap > 0:
                nps_monthly = min(budget * 0.15, nps_gap / 12)
                products.append({
                    "product":    "NPS Tier I (80CCD(1B))",
                    "monthly":    round(nps_monthly),
                    "annual":     round(nps_monthly * 12),
                    "tax_saving": round(nps_gap * 0.30),
                    "section":    "80CCD(1B)",
                    "lock_in":    0,   # till retirement
                })

        if tax_bracket >= 20 and age < 50:
            # PPF for long-term debt allocation
            ppf_balance = 0
            ppf_annual  = min(150000, 12000)  # suggest ₹1000/month
            if ppf_annual > 0:
                products.append({
                    "product":    "PPF",
                    "monthly":    1000,
                    "annual":     12000,
                    "tax_saving": round(12000 * tax_bracket / 100),
                    "section":    "80C",
                    "lock_in":    15,
                })

        return {
            "elss_monthly": round(elss_monthly),
            "nps_monthly":  round(nps_monthly),
            "ppf_annual":   round(ppf_annual),
            "products":     products,
        }

    # ── Step 3: Fund Selection ─────────────────────────────────────────────

    def _select_funds(self, alloc: dict, budget: float,
                      tax_products: dict, risk_score: float) -> List[FundAllocation]:
        funds    = []
        tax_amt  = tax_products.get("elss_monthly", 0) + tax_products.get("nps_monthly", 0)
        rem_budget = budget - tax_amt

        eq_budget    = rem_budget * alloc["equity"] / 100
        debt_budget  = rem_budget * alloc["debt"]   / 100
        gold_budget  = rem_budget * alloc["gold"]   / 100
        liquid_budget= rem_budget * alloc["liquid"] / 100

        # ELSS counts toward equity allocation
        elss = tax_products.get("elss_monthly", 0)
        if elss > 0:
            f = RECOMMENDED_FUNDS["EQ-ELSS"][0]
            funds.append(FundAllocation(
                fund_name=f["name"], category="EQ-ELSS", asset_class="Equity",
                allocation_pct=round(elss/budget*100, 1), monthly_sip=round(elss),
                tax_benefit="80C deduction", lock_in_years=3, why=f["why"]
            ))
            eq_budget = max(0, eq_budget - elss)

        # Equity sub-allocation
        if eq_budget > 0:
            # Large cap: 50% of equity, Flexi: 30%, Mid: 20% (conservative)
            large_cap = eq_budget * (0.60 if risk_score < 5 else 0.50)
            flexi_cap = eq_budget * 0.30
            mid_cap   = eq_budget * (0.10 if risk_score < 5 else 0.15)
            small_cap = eq_budget * (0.00 if risk_score < 5 else 0.05)

            for cat, amt in [("EQ-LC", large_cap), ("EQ-FLX", flexi_cap),
                             ("EQ-MC", mid_cap), ("EQ-SC", small_cap)]:
                if amt < 500: continue
                f = RECOMMENDED_FUNDS[cat][0]
                funds.append(FundAllocation(
                    fund_name=f["name"], category=cat, asset_class="Equity",
                    allocation_pct=round(amt/budget*100, 1), monthly_sip=round(amt),
                    tax_benefit="LTCG exempt up to ₹1.25L", lock_in_years=0, why=f["why"]
                ))

        # NPS
        nps = tax_products.get("nps_monthly", 0)
        if nps > 0:
            funds.append(FundAllocation(
                fund_name="NPS Tier I — Scheme E (ICICI Pension Fund)",
                category="NPS", asset_class="Hybrid",
                allocation_pct=round(nps/budget*100, 1), monthly_sip=round(nps),
                tax_benefit="80CCD(1B) — ₹50,000 extra deduction",
                lock_in_years=0, why="Avg 11.25% 5yr return, extra ₹15,000 tax saving"
            ))

        # Debt
        if debt_budget > 500:
            f = RECOMMENDED_FUNDS["DT-CB"][0]
            funds.append(FundAllocation(
                fund_name=f["name"], category="DT-CB", asset_class="Debt",
                allocation_pct=round(debt_budget/budget*100, 1), monthly_sip=round(debt_budget),
                tax_benefit="Taxed at slab rate", lock_in_years=0, why=f["why"]
            ))

        # Gold (using multi-asset as proxy if gold allocation is small)
        if gold_budget > 500:
            funds.append(FundAllocation(
                fund_name="Nippon India Gold ETF (via SGB for ₹2500+/month)",
                category="Gold", asset_class="Gold",
                allocation_pct=round(gold_budget/budget*100, 1), monthly_sip=round(gold_budget),
                tax_benefit="LTCG 12.5% without indexation", lock_in_years=0,
                why="Real gold exposure, no storage risk, SGB gives 2.5% interest bonus"
            ))

        # Liquid (emergency fund top-up)
        if liquid_budget > 500:
            f = RECOMMENDED_FUNDS["DT-LIQ"][0]
            funds.append(FundAllocation(
                fund_name=f["name"], category="DT-LIQ", asset_class="Liquid",
                allocation_pct=round(liquid_budget/budget*100, 1), monthly_sip=round(liquid_budget),
                tax_benefit="Taxed at slab", lock_in_years=0,
                why="Emergency fund top-up — T+1 redemption, capital safe"
            ))

        return funds

    # ── Rationale ─────────────────────────────────────────────────────────

    def _rationale(self, age: int, risk_score: float, alloc: dict, goals: list) -> str:
        risk_label = "aggressive" if risk_score >= 7 else "moderate" if risk_score >= 4 else "conservative"
        primary = next((g.get("goal_label","wealth creation") for g in
                        sorted(goals, key=lambda x: x.get("priority",9))), "wealth creation")
        return (
            f"At age {age} with a {risk_label} risk profile, we recommend "
            f"{alloc['equity']}% equity / {alloc['debt']}% debt / "
            f"{alloc['gold']}% gold / {alloc['liquid']}% liquid. "
            f"The primary goal '{primary}' anchors the horizon. "
            f"Equity allocation uses the 100-minus-age rule adjusted for risk score. "
            f"Gold provides inflation hedge. Debt provides stability."
        )
