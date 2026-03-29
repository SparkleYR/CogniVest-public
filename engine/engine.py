import os, json, sys, traceback, logging
from datetime import datetime
import dataclasses
from supabase import create_client

logger = logging.getLogger(__name__)

def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return None
    return create_client(url, key)

def to_dict(obj):
    if dataclasses.is_dataclass(obj):
        return dataclasses.asdict(obj)
    return obj

def run_engine_background(client_id: str, raw_profile: dict, run_id: str):
    """
    Runs in a background thread. Sequentially executes agents.
    """
    supabase = get_supabase()
    agents_completed = []
    start_time = datetime.utcnow()

    try:
        raw_profile = _enrich_profile(raw_profile)

        # Import agents
        from agents.goal_projection_agent import GoalProjectionAgent
        from agents.portfolio_construction_agent import PortfolioConstructionAgent
        from agents.insurance_tax_agent import InsuranceTaxAgent
        from agents.behaviour_agent import BehaviourProfile
        from agents.simulation_agent import SimulationAgent
        from agents.returns_agent import ReturnsAgent
        from agents.allocation_agent import AllocationAgent
        from agents.risk_agent import RiskAgent
        from agents.benchmark_agent import BenchmarkAgent

        surplus = raw_profile.get("personal", {}).get("monthly_surplus", 50000)
        b       = raw_profile.get("behaviour_profile", {})

        # Agent 1-3: Goal projection
        if supabase: _log_agent(supabase, run_id, "goal_projection")
        goal_result = GoalProjectionAgent().run(raw_profile)
        agents_completed.append("goal_projection")

        # Agent 4-5: Portfolio construction
        if supabase: _log_agent(supabase, run_id, "portfolio_construction")
        portfolio_rec = PortfolioConstructionAgent().run(raw_profile, surplus * 0.8)
        agents_completed.append("portfolio_construction")

        # Agent 6-7: Insurance + tax
        if supabase: _log_agent(supabase, run_id, "insurance_tax")
        ins_tax = InsuranceTaxAgent().run(raw_profile)
        agents_completed.append("insurance_tax")

        # Agent 8: Simulation (requires existing portfolio which is parsed via parser, we use dummy logic or the agent handles dictionary)
        if supabase: _log_agent(supabase, run_id, "simulation")
        bp = BehaviourProfile(
            loss_aversion       = b.get("loss_aversion", 5.0),
            panic_threshold_pct = b.get("panic_threshold_pct", -15.0),
            patience_score      = b.get("patience_score", 5.0),
            source              = "onboarding"
        )
        sim = SimulationAgent().run(raw_profile, bp, years=10, n_paths=300)
        agents_completed.append("simulation")

        # Run portfolio analytics agents (Returns, Allocation, Risk, Benchmark) on raw_profile directly
        # Wrap assets under "holdings" key so AllocationAgent can find them
        alloc_input = {**raw_profile, "holdings": raw_profile.get("existing_portfolio", {}).get("assets", [])}
        returns_res = ReturnsAgent().run(raw_profile)
        alloc_res = AllocationAgent().run(alloc_input)
        risk_res = RiskAgent().run(raw_profile)
        bench_res = BenchmarkAgent().run(raw_profile)

        # Assemble twin_output
        personal = raw_profile.get("personal", {})

        twin_output = {
            "client_summary": {
                "client_id":       client_id,
                "name":            personal.get("name"),
                "age":             personal.get("age"),
                "city":            personal.get("city"),
                "occupation":      personal.get("occupation"),
                "monthly_income":  personal.get("monthly_income"),
                "monthly_surplus": personal.get("monthly_surplus"),
                "risk_label":      raw_profile.get("risk_profile", {}).get("risk_label"),
                "twin_confidence": 0.82,
                "status":          "new",
                "primary_concern": raw_profile.get("problem_statement", {}).get("primary_concern"),
            },
            
            "portfolio_snapshot": _build_portfolio_snapshot(raw_profile, returns_res, alloc_res, risk_res, bench_res),

            "behaviour_profile": {
                **b,
                "simulation": {
                    "rational_median_10yr":    sim.rational_median,
                    "behavioural_median_10yr": sim.median_terminal,
                    "wealth_gap_inr":          sim.median_behaviour_cost,
                    "panic_rate_pct":          sim.panic_rate_pct,
                    "p10_outcome":             sim.rational_p10 if hasattr(sim, 'rational_p10') else sim.p10_terminal,
                    "p90_outcome":             sim.rational_p90 if hasattr(sim, 'rational_p90') else sim.p90_terminal,
                    "percentile_series":       sim.percentile_series,
                    "panic_events":            sim.panic_events,
                    "years":                   int(sim.years),
                },
                "behaviour_cost_10yr_inr": sim.median_behaviour_cost,
            },

            "goals":        to_dict(goal_result).get("goals", []),
            "goal_summary": {
                "overall_score":         to_dict(goal_result).get("overall_score"),
                "overall_verdict":       to_dict(goal_result).get("overall_verdict"),
                "total_sip_needed":      to_dict(goal_result).get("total_sip_needed"),
                "total_sip_current":     to_dict(goal_result).get("total_sip_current"),
                "total_sip_gap":         to_dict(goal_result).get("total_sip_gap"),
                "surplus_after_goals":   to_dict(goal_result).get("surplus_after_goals"),
                "emergency_fund_status": to_dict(goal_result).get("emergency_fund_status"),
                "recommended_actions":   to_dict(goal_result).get("recommended_actions"),
            },

            "recommended_portfolio": {
                "allocation": {
                    "equity":  portfolio_rec.equity_pct,
                    "debt":    portfolio_rec.debt_pct,
                    "gold":    portfolio_rec.gold_pct,
                    "liquid":  portfolio_rec.liquid_pct,
                },
                "total_monthly_sip":   portfolio_rec.total_monthly_sip,
                "funds":               to_dict(portfolio_rec).get("funds", []),
                "tax_saving_products": portfolio_rec.tax_saving_products,
                "elss_sip":            portfolio_rec.elss_sip,
                "nps_monthly":         portfolio_rec.nps_monthly,
                "ppf_annual":          portfolio_rec.ppf_annual,
                "allocation_rationale": portfolio_rec.allocation_rationale,
                "assumptions":         portfolio_rec.assumptions,
                "disclaimers":         portfolio_rec.disclaimers,
            },

            "insurance": ins_tax.get("insurance", {}),
            "tax":        ins_tax.get("tax", {}),
            "liabilities": ins_tax.get("liabilities", {}),
            "succession":  ins_tax.get("succession", {}),

            "flags":                  _build_flags(ins_tax, to_dict(goal_result), raw_profile, alloc_res),
            "advisor_talking_points": _build_talking_points(raw_profile, to_dict(goal_result), ins_tax),
            "computed_at":            datetime.utcnow().isoformat(),
        }

        # Agent 12: Analyser — synthesises all outputs into health scores + priority actions
        from agents.analyser_agent import AnalyserAgent
        try:
            analysis = AnalyserAgent().run(twin_output, raw_profile)
            twin_output["analysis"] = analysis
            agents_completed.append("analyser")
        except Exception as e:
            logger.error("AnalyserAgent failed: %s", e)
            twin_output["analysis"] = {"error": str(e), "health_scores": {}}

        # Write to Supabase (forces realtime broadcast)
        if supabase:
            supabase.table("clients").update({
                "twin_output":      twin_output,
                "twin_confidence":  0.82,
                "engine_done":      True,
                "status":           "active",
                "twin_computed_at": datetime.utcnow().isoformat(),
                "updated_at":       datetime.utcnow().isoformat()
            }).eq("client_id", client_id).execute()

            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            supabase.table("engine_runs").update({
                "status":       "completed",
                "agents_run":   agents_completed,
                "duration_ms":  duration_ms,
                "completed_at": datetime.utcnow().isoformat()
            }).eq("run_id", run_id).execute()

    except Exception as e:
        if supabase:
            supabase.table("engine_runs").update({
                "status":    "failed",
                "error_msg": f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()[:500]}",
                "completed_at": datetime.utcnow().isoformat()
            }).eq("run_id", run_id).execute()

            supabase.table("clients").update({
                "status":     "new",
                "engine_done": False,
                "twin_output": {"error": str(e), "computed_at": datetime.utcnow().isoformat()},
                "updated_at": datetime.utcnow().isoformat()
            }).eq("client_id", client_id).execute()
        print(f"Engine Run Failed: {e}")
        traceback.print_exc()

def _enrich_profile(profile: dict) -> dict:
    if "insurance" not in profile or not profile["insurance"]:
        profile["insurance"] = {
            "term_life": {"has_term_plan": False, "sum_assured": 0},
            "health_insurance": {"has_health_insurance": False, "policies": []},
            "other_insurance": {"has_ulip": False}
        }
    if "tax_profile" not in profile: profile["tax_profile"] = {}
    if "complete_tax_profile" not in profile["tax_profile"]:
        profile["tax_profile"]["complete_tax_profile"] = {
            "deductions_80_series": {"80C": {"current_utilisation": 0}, "80CCD_1B": 0, "80D": {"total_80D_deduction": 0}},
            "salary_deductions": {"home_loan_interest_24b": 0, "hra_exempt": 0},
            "capital_gains": {"equity_ltcg_this_fy": 0, "ltcg_exemption_used": 0}
        }
    if "liabilities" not in profile or not profile["liabilities"]:
        profile["liabilities"] = {}
    if "succession_planning" not in profile or not profile["succession_planning"]:
        profile["succession_planning"] = {"has_will": False, "nominees_updated": False}
    return profile

def _build_portfolio_snapshot(raw_profile: dict, returns, alloc, risk, bench) -> dict:
    ep = raw_profile.get("existing_portfolio", {})
    holdings = []
    for asset in ep.get("assets", []):
        pv = asset.get("purchase_value", 0)
        cv = asset.get("current_value", 0)
        holdings.append({
            **asset,
            "gain_pct": round((cv - pv) / pv * 100, 2) if pv > 0 else 0,
            "weight_pct": round(cv / ep.get("total_current_value", 1) * 100, 2) if ep.get("total_current_value", 1) > 0 else 0
        })
    # Use AllocationAgent result if available, else compute simple cap split from asset names
    equity_cap_split = alloc.get("equity_cap_split_pct")
    if not equity_cap_split:
        equity_cap_split = _compute_equity_cap_split(ep.get("assets", []))
    return {
        "total_invested":       ep.get("total_invested", 0),
        "total_current_value":  ep.get("total_current_value", 0),
        "total_gain":           returns.get("total_gain_inr", 0),
        "abs_return_pct":       returns.get("portfolio_abs_return", 0),
        "xirr_pct":             returns.get("portfolio_xirr_pct", 0),
        "nifty_alpha_pp":       bench.get("estimated_alpha_pp", 0),
        "asset_allocation":     alloc.get("asset_allocation_pct", {}),
        "equity_cap_split":     equity_cap_split,
        "hhi_concentration":    alloc.get("hhi", 0),
        "volatility_pct":       risk.get("portfolio_volatility_ann_pct", 0),
        "var_95_1day_pct":      risk.get("var_95_1day_pct", 0),
        "shock_loss_20pct_inr": risk.get("20pct_shock_loss_inr", 0),
        "holdings":             holdings,
    }


def _compute_equity_cap_split(assets: list) -> dict:
    """Fallback cap split: classifies equity/hybrid assets by fund name keywords."""
    caps = {"Large": 0.0, "Mid": 0.0, "Small": 0.0}
    equity_total = sum(
        a.get("current_value", 0) for a in assets
        if a.get("asset_class") in ("Equity", "Hybrid")
    )
    if equity_total == 0:
        return caps
    for a in assets:
        if a.get("asset_class") not in ("Equity", "Hybrid"):
            continue
        cv   = a.get("current_value", 0)
        name = (a.get("name") or "").lower()
        if "small" in name:
            caps["Small"] += cv
        elif "mid" in name:
            caps["Mid"] += cv
        else:
            caps["Large"] += cv  # large cap, index, flexi, multi-asset, NPS → Large
    return {k: round(v / equity_total * 100, 2) for k, v in caps.items()}

def _build_flags(ins_tax: dict, goal_result: dict, raw_profile: dict = None, alloc_res: dict = None) -> list:
    flags = []
    raw_profile = raw_profile or {}
    alloc_res   = alloc_res or {}

    # ── Insurance flags (from InsuranceTaxAgent) ──────────────
    for f in ins_tax.get("insurance", {}).get("flags", []):
        flags.append(f)

    # ── Succession ────────────────────────────────────────────
    if not ins_tax.get("succession", {}).get("has_will"):
        flags.append({"type": "no_will", "severity": "critical", "message": "No will. Update nominees and create will."})

    # ── Liabilities ───────────────────────────────────────────
    if (ins_tax.get("liabilities", {}).get("foir_pct") or 0) > 50:
        flags.append({"type": "high_foir", "severity": "warning", "message": f"FOIR {ins_tax['liabilities']['foir_pct']}% — above 50%"})

    # ── Goal urgent actions ────────────────────────────────────
    for action in goal_result.get("recommended_actions", []):
        if action.get("urgency") == "immediate":
            flags.append({"type": action["action"], "severity": "warning", "message": action["message"]})

    # ── concentration: HHI > 0.25 ─────────────────────────────
    hhi = alloc_res.get("hhi", 0)
    if hhi > 0.25:
        flags.append({
            "type": "concentration",
            "severity": "warning",
            "message": f"Portfolio is highly concentrated (HHI {hhi:.2f}). Top holding likely exceeds 30% of portfolio."
        })

    # ── tax_regime: client on suboptimal regime ────────────────
    tax = ins_tax.get("tax", {})
    optimal  = tax.get("optimal_regime")
    current  = tax.get("current_regime", "unknown")
    saving   = tax.get("regime_saving_inr", 0)
    if optimal and current != "unknown" and current != optimal and saving > 5000:
        flags.append({
            "type": "tax_regime",
            "severity": "warning",
            "message": f"Client is on {current} regime but {optimal} regime saves ₹{saving:,.0f}/year."
        })

    # ── low_emergency: emergency fund < 3 months ──────────────
    em = goal_result.get("emergency_fund_status", {})
    funded_months = em.get("funded_months", 0)
    if funded_months < 3 and em:
        flags.append({
            "type": "low_emergency",
            "severity": "critical" if funded_months == 0 else "warning",
            "message": f"Emergency fund covers only {funded_months:.1f} months. Target: 6 months before investing in equity."
        })

    # ── short_term: goals < 3 years with equity exposure ──────
    equity_pct = alloc_res.get("asset_allocation_pct", {}).get("Equity", 0)
    goals = raw_profile.get("goals", [])
    short_goals = [g for g in goals if g.get("horizon_years", 99) < 3]
    if short_goals and equity_pct > 40:
        labels = ", ".join(g.get("goal_label", g.get("goal_type", "")) for g in short_goals)
        flags.append({
            "type": "short_term",
            "severity": "warning",
            "message": f"Goal(s) within 3 years ({labels}) but {equity_pct:.0f}% in equity. Shift to debt/liquid for near-term goals."
        })

    # ── high_equity: equity allocation vs risk profile ─────────
    risk_label = raw_profile.get("risk_profile", {}).get("risk_label", "")
    MAX_EQUITY = {"conservative": 30, "moderate": 60, "moderately_aggressive": 75, "aggressive": 100}
    max_eq = MAX_EQUITY.get(risk_label, 100)
    if equity_pct > max_eq:
        flags.append({
            "type": "high_equity",
            "severity": "warning",
            "message": f"{equity_pct:.0f}% equity allocation exceeds recommended max of {max_eq}% for a {risk_label} investor."
        })

    severity_order = {"critical": 0, "warning": 1, "high": 2, "info": 3}
    return sorted(flags, key=lambda f: severity_order.get(f["severity"], 4))

def _build_talking_points(raw: dict, goals: dict, ins_tax: dict) -> list:
    points = []
    b = raw.get("behaviour_profile", {})
    if b.get("sold_in_panic"):
        points.append("Client panic-sold before. Open with the cost of that decision in ₹.")
    gap = goals.get("total_sip_gap", 0)
    if gap > 0:
        points.append(f"SIP gap is ₹{gap:,.0f}/month. Prepare them — this will be a shock.")
    saving = ins_tax.get("tax", {}).get("total_potential_tax_saving", 0)
    if saving > 10000:
        points.append(f"Quick win: ₹{saving:,.0f}/year tax saving. Do this in first meeting.")
    ins_gap = ins_tax.get("insurance", {}).get("term_life", {}).get("coverage_gap", 0)
    if ins_gap > 0:
        points.append(f"Insurance gap ₹{ins_gap:,.0f}. Handle with care.")
    return points[:5]

def _log_agent(supabase, run_id: str, agent_name: str):
    try:
        run = supabase.table("engine_runs").select("agents_run").eq("run_id", run_id).single().execute().data
        current = run.get("agents_run") or []
        current.append(agent_name)
        supabase.table("engine_runs").update({"agents_run": current}).eq("run_id", run_id).execute()
    except Exception:
        pass
