class AllocationAgent:
    """Calculates asset allocation, cap split, sector weights, and drift from target."""

    def run(self, portfolio: dict) -> dict:
        holdings = portfolio.get("holdings", [])
        if not holdings:
            return {"error": "No holdings found in portfolio"}

        total_cv = sum(h.get("current_value", 0) for h in holdings)
        if total_cv == 0:
            return {"error": "Total current value is zero"}

        asset_alloc  = self.asset_allocation(holdings, total_cv)
        cap_split    = self.cap_split(holdings, total_cv)
        sector_w     = self.sector_weights(holdings, total_cv)
        drift        = self.drift_from_target(asset_alloc, portfolio.get("target_allocation", {}))
        hhi          = self.herfindahl(holdings, total_cv)
        top_holding  = max(holdings, key=lambda h: h.get("current_value", 0))

        return {
            "total_current_value":       round(total_cv, 2),
            "asset_allocation_pct":      asset_alloc,
            "equity_cap_split_pct":      cap_split,
            "top_sectors":               sector_w[:6],
            "drift_from_target_pp":      drift,
            "hhi":                       round(hhi, 4),
            "hhi_interpretation":        self._hhi_label(hhi),
            "top_holding_name":          top_holding.get("name", ""),
            "top_holding_pct":           round(top_holding.get("current_value", 0) / total_cv * 100, 2),
            "single_fund_risk_flag":     (top_holding.get("current_value", 0) / total_cv) > 0.30,
            "num_schemes":               len(holdings),
        }

    def asset_allocation(self, holdings: list, total_cv: float) -> dict:
        if total_cv == 0:
            return {}
        buckets = {}
        for h in holdings:
            cat = h.get("asset_class", "Other")
            buckets[cat] = buckets.get(cat, 0) + h.get("current_value", 0)
        return {k: round(v / total_cv * 100, 2)
                for k, v in sorted(buckets.items(), key=lambda x: -x[1])}

    def cap_split(self, holdings: list, total_cv: float) -> dict:
        """
        Computes large/mid/small split across equity+hybrid holdings.

        Priority order:
          1. If holding has scrip_level_holdings (list of {symbol, value}),
             classify each scrip using real NSE index data.
          2. If holding has cap_breakdown dict, use weighted fractions.
          3. Fall back to cap_category string.
        """
        caps = {"Large": 0.0, "Mid": 0.0, "Small": 0.0, "Unknown": 0.0}
        equity_cv = sum(
            h.get("current_value", 0) for h in holdings
            if "Equity" in h.get("asset_class", "") or "Hybrid" in h.get("asset_class", "")
        )
        if equity_cv == 0:
            return {"Large": 0.0, "Mid": 0.0, "Small": 0.0}

        # Try to import NSE lookup (available when data/ files are present)
        try:
            from utils.nse_index import get_cap_category
            nse_available = True
        except ImportError:
            nse_available = False

        for h in holdings:
            if "Equity" not in h.get("asset_class", "") and "Hybrid" not in h.get("asset_class", ""):
                continue
            cv = h.get("current_value", 0)

            # Option 1: scrip-level holdings with real NSE symbols
            scrips = h.get("scrip_level_holdings", [])
            if scrips and nse_available:
                total_scrip_val = sum(s.get("value", 0) for s in scrips)
                for s in scrips:
                    sym = s.get("symbol", "")
                    val = s.get("value", 0)
                    frac = val / total_scrip_val if total_scrip_val > 0 else 0
                    cat = get_cap_category(sym)
                    caps[cat] = caps.get(cat, 0) + cv * frac
                continue

            # Option 2: pre-computed cap_breakdown fractions
            breakdown = h.get("cap_breakdown", {})
            if breakdown:
                for cap_key in ("Large", "Mid", "Small"):
                    caps[cap_key] = caps.get(cap_key, 0) + cv * breakdown.get(cap_key, 0)
                continue

            # Option 3: single cap_category string
            cap = h.get("cap_category", "Large") or "Large"
            caps[cap] = caps.get(cap, 0) + cv

        # Drop Unknown from output if zero, normalise to equity_cv
        result = {}
        for k in ("Large", "Mid", "Small"):
            result[k] = round(caps.get(k, 0) / equity_cv * 100, 2)
        if caps.get("Unknown", 0) > 0:
            result["Unknown"] = round(caps["Unknown"] / equity_cv * 100, 2)
        return result

    def sector_weights(self, holdings: list, total_cv: float) -> list:
        if total_cv == 0:
            return []
        sectors = {}
        for h in holdings:
            for sector, val in h.get("sector_breakdown", {}).items():
                sectors[sector] = sectors.get(sector, 0) + val
        return [
            {"sector": k, "pct": round(v / total_cv * 100, 2)}
            for k, v in sorted(sectors.items(), key=lambda x: -x[1])
        ]

    def drift_from_target(self, current: dict, target: dict) -> dict:
        if not target:
            return {}
        all_keys = set(list(current.keys()) + list(target.keys()))
        return {
            k: round(current.get(k, 0) - target.get(k, 0), 2)
            for k in all_keys
        }

    def herfindahl(self, holdings: list, total_cv: float) -> float:
        """HHI: sum of squared weights. >0.25 concentrated, <0.10 diversified."""
        if total_cv == 0:
            return 0.0
        weights = [h.get("current_value", 0) / total_cv for h in holdings]
        return sum(w ** 2 for w in weights)

    def _hhi_label(self, hhi: float) -> str:
        if hhi > 0.25: return "highly concentrated"
        if hhi > 0.15: return "moderately concentrated"
        if hhi > 0.10: return "moderate"
        return "diversified"
