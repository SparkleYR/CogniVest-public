from scipy.optimize import brentq
from datetime import datetime
import numpy as np


class ReturnsAgent:
    """Calculates XIRR, CAGR, absolute return, holding period per scheme."""

    def run(self, portfolio: dict) -> dict:
        schemes = portfolio.get("schemes", [])
        results = []

        for s in schemes:
            holding_days = s.get("holding_days", 1)
            pv = s.get("purchase_value", 0)
            cv = s.get("current_value", 0)
            cashflows = s.get("cashflows", [])

            xirr_val = self.xirr(cashflows) if cashflows else self.cagr(pv, cv, holding_days)

            results.append({
                "scheme":          s["name"],
                "purchase_value":  round(pv, 2),
                "current_value":   round(cv, 2),
                "gain_inr":        round(cv - pv, 2),
                "abs_return_pct":  round(self.abs_return(pv, cv) * 100, 2),
                "cagr_pct":        round(self.cagr(pv, cv, holding_days) * 100, 2),
                "xirr_pct":        round(xirr_val * 100, 2),
                "holding_days":    holding_days,
                "flag_short_term": holding_days < 365,
            })

        total_pv = sum(s.get("purchase_value", 0) for s in schemes)
        total_cv = sum(s.get("current_value", 0) for s in schemes)
        all_cfs  = portfolio.get("all_cashflows", [])
        reported = portfolio.get("reported", {})

        # Use PDF-reported XIRR if available (authoritative); fall back to computed
        reported_xirr = reported.get("xirr_pct")
        computed_xirr = round(self.xirr(all_cfs) * 100, 2) if all_cfs else None

        return {
            "scheme_returns":             results,
            "portfolio_xirr_pct":         reported_xirr or computed_xirr,
            "portfolio_xirr_source":      "pdf_reported" if reported_xirr else "computed_approx",
            "portfolio_xirr_computed":    computed_xirr,
            "portfolio_abs_return":       round(self.abs_return(total_pv, total_cv) * 100, 2),
            "total_invested":             round(total_pv, 2),
            "total_current_value":        round(total_cv, 2),
            "total_gain_inr":             round(total_cv - total_pv, 2),
            "net_investment":             reported.get("net_investment", total_pv),
        }

    def xirr(self, cashflows: list) -> float:
        """
        Newton-Raphson XIRR.
        cashflows: [{"date": "YYYY-MM-DD", "amount": float}]
        Negative amount = investment (outflow), positive = redemption/current value (inflow).
        """
        if not cashflows or len(cashflows) < 2:
            return 0.0
        try:
            dates   = [datetime.strptime(cf["date"], "%Y-%m-%d").date() for cf in cashflows]
            amounts = [cf["amount"] for cf in cashflows]
            t0      = dates[0]
            years   = [(d - t0).days / 365.25 for d in dates]

            def npv(r):
                return sum(a / (1 + r) ** t for a, t in zip(amounts, years))

            return brentq(npv, -0.9999, 100.0, maxiter=1000)
        except (ValueError, ZeroDivisionError):
            return float("nan")

    def cagr(self, pv: float, cv: float, holding_days: int) -> float:
        if pv <= 0 or holding_days <= 0:
            return 0.0
        years = holding_days / 365.25
        return (cv / pv) ** (1 / years) - 1

    def abs_return(self, pv: float, cv: float) -> float:
        if pv <= 0:
            return 0.0
        return (cv - pv) / pv
