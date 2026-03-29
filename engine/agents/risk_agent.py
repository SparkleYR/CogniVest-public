import numpy as np
from scipy.stats import norm


class RiskAgent:
    """Computes equity concentration, HHI, portfolio volatility, max drawdown, VaR."""

    # Annualised volatility priors by sub-category (when no NAV series available)
    VOL_PRIORS = {
        "Equity:Large Cap":       0.14,
        "Equity:Large & Mid Cap": 0.16,
        "Equity:Mid Cap":         0.18,
        "Equity:Small Cap":       0.22,
        "Equity:Thematic":        0.20,
        "Equity:Flexi Cap":       0.17,
        "Equity:ELSS":            0.16,
        "Hybrid:Multi-Asset":     0.10,
        "Hybrid:Aggressive":      0.13,
        "Hybrid:Balanced":        0.09,
        "Debt:Liquid":            0.01,
        "Debt:Short Duration":    0.03,
        "Debt:Corporate Bond":    0.05,
        "Gold":                   0.15,
    }
    EQUITY_CORR = 0.70  # conservative same-asset-class correlation assumption

    def run(self, portfolio: dict) -> dict:
        holdings = portfolio.get("holdings", [])
        if not holdings:
            return {"error": "No holdings"}

        total_cv = sum(h.get("current_value", 0) for h in holdings)
        if total_cv == 0:
            return {"error": "Total current value is zero"}
        weights  = [h.get("current_value", 0) / total_cv for h in holdings]

        equity_cv   = sum(h.get("current_value", 0) for h in holdings
                          if "Equity" in h.get("asset_class", ""))
        equity_pct  = equity_cv / total_cv

        hhi         = sum(w ** 2 for w in weights)
        port_vol    = self._portfolio_volatility(holdings, weights)
        max_dd      = self._max_drawdown(portfolio.get("nav_series", []))
        var_95_1day = self._parametric_var(port_vol, confidence=0.95)
        var_99_1day = self._parametric_var(port_vol, confidence=0.99)

        # Estimated 20% drawdown impact on current portfolio
        sample_shock_loss = total_cv * 0.20

        return {
            "equity_concentration_pct":    round(equity_pct * 100, 2),
            "hhi":                         round(hhi, 4),
            "hhi_interpretation":          self._hhi_label(hhi),
            "portfolio_volatility_ann_pct": round(port_vol * 100, 2),
            "var_95_1day_pct":             round(var_95_1day * 100, 2),
            "var_99_1day_pct":             round(var_99_1day * 100, 2),
            "max_drawdown_pct":            round(max_dd * 100, 2) if max_dd is not None else None,
            "top_3_holdings_pct":          round(sum(sorted(weights, reverse=True)[:3]) * 100, 2),
            "single_fund_flag":            max(weights) > 0.30,
            "20pct_shock_loss_inr":        round(sample_shock_loss, 2),
            "equity_shock_20pct_inr":      round(equity_cv * 0.20, 2),
        }

    def _portfolio_volatility(self, holdings: list, weights: list) -> float:
        vols = [self.VOL_PRIORS.get(h.get("sub_category", ""), 0.16) for h in holdings]
        variance = sum(w ** 2 * v ** 2 for w, v in zip(weights, vols))
        # Add covariance between equity funds only
        covariance = 0.0
        for i in range(len(holdings)):
            for j in range(i + 1, len(holdings)):
                if ("Equity" in holdings[i].get("asset_class", "") and
                        "Equity" in holdings[j].get("asset_class", "")):
                    covariance += 2 * weights[i] * weights[j] * vols[i] * vols[j] * self.EQUITY_CORR
        return (variance + covariance) ** 0.5

    def _max_drawdown(self, nav_series: list):
        if len(nav_series) < 2:
            return None
        peak, max_dd = nav_series[0], 0.0
        for nav in nav_series:
            peak = max(peak, nav)
            if peak == 0:
                continue
            max_dd = max(max_dd, (peak - nav) / peak)
        return max_dd

    def _parametric_var(self, annual_vol: float, confidence: float = 0.95) -> float:
        daily_vol = annual_vol / (252 ** 0.5)
        return norm.ppf(1 - confidence) * daily_vol * -1

    def _hhi_label(self, hhi: float) -> str:
        if hhi > 0.25: return "highly concentrated"
        if hhi > 0.15: return "moderately concentrated"
        if hhi > 0.10: return "moderate"
        return "diversified"
