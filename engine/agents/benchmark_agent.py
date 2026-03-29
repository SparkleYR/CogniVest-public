import numpy as np
from agents.returns_agent import ReturnsAgent


class BenchmarkAgent:
    """
    Computes alpha, Sharpe, Sortino, beta, information ratio vs Nifty 50.

    Modes (auto-selected):
      full                  -- portfolio monthly_returns + real Nifty + real T-bill
      benchmark_data_ready  -- real Nifty + T-bill loaded; portfolio monthly returns missing
      fallback_xirr_only    -- no market data files; estimates from XIRR vs long-run avg
    """

    def run(self, portfolio: dict, benchmark_returns: list = None) -> dict:
        benchmark_returns = benchmark_returns or []
        port_returns      = portfolio.get("monthly_returns", [])
        real_data         = self._load_real_data()

        if real_data and port_returns:
            return self._full_mode(port_returns, real_data)

        if real_data:
            return self._benchmark_only(portfolio, real_data)

        if benchmark_returns and port_returns:
            return self._full_mode_raw(port_returns, benchmark_returns)

        return self._fallback(portfolio, real_data)

    def _load_real_data(self):
        try:
            from utils.market_data import get_aligned_series
            data = get_aligned_series()
            return data if data['n_months'] >= 12 else None
        except Exception:
            return None

    def _fallback(self, portfolio: dict, real_data) -> dict:
        ra            = ReturnsAgent()
        xirr          = ra.xirr(portfolio.get("all_cashflows", []))
        reported_xirr = portfolio.get("reported", {}).get("xirr_pct")
        xirr_used     = (reported_xirr / 100) if reported_xirr else (xirr or 0)
        nifty_cagr    = real_data['nifty_ann_cagr'] / 100 if real_data else 0.1265
        avg_rf_ann    = real_data['tbill_avg_ann']   / 100 if real_data else 0.065

        return {
            "mode":               "fallback_xirr_only",
            "portfolio_xirr_pct": round(xirr_used * 100, 2),
            "benchmark_cagr_pct": round(nifty_cagr * 100, 2),
            "estimated_alpha_pp": round(xirr_used * 100 - nifty_cagr * 100, 2),
            "avg_rf_annual_pct":  round(avg_rf_ann * 100, 2),
            "sharpe_ratio":       None,
            "sortino_ratio":      None,
            "beta":               None,
            "note":               "Add monthly_returns to portfolio dict for full metrics.",
        }

    def _benchmark_only(self, portfolio: dict, real_data: dict) -> dict:
        ra            = ReturnsAgent()
        xirr          = ra.xirr(portfolio.get("all_cashflows", []))
        reported_xirr = portfolio.get("reported", {}).get("xirr_pct")
        xirr_used     = (reported_xirr / 100) if reported_xirr else (xirr or 0)

        nifty_rets  = np.array(real_data['nifty_returns'])
        tbill_rfs   = np.array(real_data['tbill_rf'])
        nifty_excess = nifty_rets - tbill_rfs
        nifty_sharpe = (np.mean(nifty_excess) / np.std(nifty_excess)) * (12 ** 0.5) if np.std(nifty_excess) > 0 else 0

        # Nifty max drawdown from close prices
        try:
            from utils.market_data import get_nifty_monthly_returns
            closes  = [r['close'] for r in get_nifty_monthly_returns()]
            peak, max_dd = closes[0], 0.0
            for c in closes:
                peak   = max(peak, c)
                max_dd = max(max_dd, (peak - c) / peak)
        except Exception:
            max_dd = None

        return {
            "mode":                   "benchmark_data_ready",
            "data_period":            f"{real_data['start']} to {real_data['end']}",
            "n_months":               real_data['n_months'],
            "nifty_ann_cagr_pct":     real_data['nifty_ann_cagr'],
            "nifty_sharpe_ratio":     round(float(nifty_sharpe), 3),
            "nifty_max_drawdown_pct": round(max_dd * 100, 2) if max_dd is not None else None,
            "avg_rf_annual_pct":      real_data['tbill_avg_ann'],
            "portfolio_xirr_pct":     round(xirr_used * 100, 2),
            "estimated_alpha_pp":     round(xirr_used * 100 - real_data['nifty_ann_cagr'], 2),
            "sharpe_ratio":           None,
            "sortino_ratio":          None,
            "beta":                   None,
            "note":                   "Add monthly_returns to portfolio dict for Sharpe/Sortino/beta.",
        }

    def _full_mode(self, port_returns: list, real_data: dict) -> dict:
        n  = len(port_returns)
        b  = np.array(real_data['nifty_returns'][-n:])
        p  = np.array(port_returns[:len(b)])
        rf = np.array(real_data['tbill_rf'][-len(p):])
        return self._compute(p, b, rf, real_data)

    def _full_mode_raw(self, port_returns, benchmark_returns) -> dict:
        n  = min(len(port_returns), len(benchmark_returns))
        p  = np.array(port_returns[:n])
        b  = np.array(benchmark_returns[:n])
        rf = np.full(n, 6.5 / 12)
        return self._compute(p, b, rf, None)

    def _compute(self, p, b, rf, real_data) -> dict:
        if len(p) == 0 or len(b) == 0:
            return {"error": "Empty return series", "mode": "full"}
        excess_p = p - rf
        active   = p - b

        ann_p  = (np.prod(1 + p / 100)) ** (12 / len(p)) - 1
        ann_b  = (np.prod(1 + b / 100)) ** (12 / len(b)) - 1
        alpha  = ann_p - ann_b

        sharpe  = (np.mean(excess_p) / np.std(excess_p)) * (12 ** 0.5) if np.std(excess_p) > 0 else 0
        down    = excess_p[excess_p < 0]
        down_s  = np.std(down) if len(down) > 0 else 1e-9
        sortino = (np.mean(excess_p) / down_s) * (12 ** 0.5)

        cov  = np.cov(p, b)[0][1]
        beta = cov / np.var(b) if np.var(b) > 0 else 1.0
        ir   = (np.mean(active) / np.std(active)) * (12 ** 0.5) if np.std(active) > 0 else 0
        te   = np.std(active) * (12 ** 0.5)

        rolling = [(np.prod(1 + p[i:i+12] / 100) - 1) * 100
                   for i in range(len(p) - 11)] if len(p) >= 12 else []

        return {
            "mode":                    "full",
            "n_months":                int(len(p)),
            "data_period":             f"{real_data['start']} to {real_data['end']}" if real_data else "custom",
            "portfolio_ann_cagr_pct":  round(float(ann_p) * 100, 2),
            "benchmark_ann_cagr_pct":  round(float(ann_b) * 100, 2),
            "alpha_annual_pct":        round(float(alpha) * 100, 2),
            "beta":                    round(float(beta), 3),
            "sharpe_ratio":            round(float(sharpe), 3),
            "sortino_ratio":           round(float(sortino), 3),
            "information_ratio":       round(float(ir), 3),
            "tracking_error_ann_pct":  round(float(te), 2),
            "rolling_12m_latest_pct":  round(float(rolling[-1]), 2) if rolling else None,
            "rolling_12m_min_pct":     round(float(min(rolling)), 2) if rolling else None,
            "rolling_12m_max_pct":     round(float(max(rolling)), 2) if rolling else None,
            "avg_rf_annual_pct":       round(float(np.mean(rf)) * 12, 2),
        }
