# NAV history loader
#
# Reads NAV CSV files downloaded by fetch_nav_history.py and provides:
#   get_fund_monthly_returns(scheme_code)  -- monthly % returns for one fund
#   get_portfolio_monthly_returns(weights) -- weighted portfolio return series
#   nav_files_available()                  -- list of funds with NAV data ready

import os
import csv
from datetime import datetime
from collections import defaultdict

from pathlib import Path
DATA_DIR = str(Path(__file__).resolve().parent.parent / 'data')

SCHEME_CODES = {
    "icici_large_cap":    118989,
    "icici_multi_asset":  120586,
    "mirae_mfg_etf_fof":  152703,
    "axis_large_midcap":  120503,
    "bajaj_flexi_cap":    150627,
    "bajaj_liquid":       150622,
}

_nav_cache = {}


def _parse_nav_date(s: str) -> datetime:
    # AMFI format: DD-Mon-YYYY  e.g. "31-Jan-2024"
    for fmt in ("%d-%b-%Y", "%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s.strip(), fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {s}")


def nav_files_available() -> list:
    """Return list of (scheme_code, short_name, filepath) for available NAV files."""
    available = []
    for f in os.listdir(DATA_DIR):
        if f.startswith("nav_") and f.endswith(".csv"):
            parts = f.replace(".csv", "").split("_", 2)
            if len(parts) >= 2:
                try:
                    code = int(parts[1])
                    name = parts[2] if len(parts) > 2 else str(code)
                    available.append((code, name, os.path.join(DATA_DIR, f)))
                except ValueError:
                    continue
    return available


def get_fund_monthly_returns(scheme_code: int) -> list:
    """
    Load NAV history for a scheme and convert to monthly return series.

    Returns list of dicts: {year, month, return_pct, nav_end}
    Sorted oldest first. Returns [] if file not found.
    """
    global _nav_cache
    if scheme_code in _nav_cache:
        return _nav_cache[scheme_code]

    # Find the file
    path = None
    for f in os.listdir(DATA_DIR):
        if f.startswith(f"nav_{scheme_code}_") and f.endswith(".csv"):
            path = os.path.join(DATA_DIR, f)
            break

    if not path or not os.path.exists(path):
        return []

    rows = []
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                rows.append({
                    "date": _parse_nav_date(r["date"]),
                    "nav":  float(r["nav"]),
                })
            except (ValueError, KeyError):
                continue

    rows.sort(key=lambda x: x["date"])

    # Group by year-month, use last NAV of each month
    monthly = defaultdict(list)
    for r in rows:
        monthly[(r["date"].year, r["date"].month)].append(r["nav"])

    keys   = sorted(monthly.keys())
    result = []
    for i in range(1, len(keys)):
        prev_nav = monthly[keys[i - 1]][-1]
        curr_nav = monthly[keys[i]][-1]
        ret      = (curr_nav / prev_nav - 1) * 100
        result.append({
            "year":       keys[i][0],
            "month":      keys[i][1],
            "return_pct": round(ret, 4),
            "nav_end":    round(curr_nav, 4),
        })

    _nav_cache[scheme_code] = result
    return result


def get_portfolio_monthly_returns(scheme_weights: dict) -> list:
    """
    Compute weighted portfolio monthly return series.

    scheme_weights: {scheme_code: weight_fraction}
      e.g. {118989: 0.22, 120586: 0.35, 152703: 0.19, 120503: 0.15, 150627: 0.08, 150622: 0.001}
      Weights should sum to ~1.0

    Returns list of dicts: {year, month, return_pct}
    Only includes months where ALL schemes have data.
    """
    # Load returns for each scheme
    series = {}
    for code, weight in scheme_weights.items():
        rets = get_fund_monthly_returns(code)
        if rets:
            series[code] = {
                (r["year"], r["month"]): r["return_pct"]
                for r in rets
            }

    if not series:
        return []

    # Find common months across all schemes
    common_months = None
    for code, monthly in series.items():
        months = set(monthly.keys())
        common_months = months if common_months is None else common_months & months

    if not common_months:
        return []

    result = []
    for ym in sorted(common_months):
        weighted_ret = sum(
            series[code][ym] * weight
            for code, weight in scheme_weights.items()
            if code in series and ym in series[code]
        )
        result.append({
            "year":       ym[0],
            "month":      ym[1],
            "return_pct": round(weighted_ret, 4),
        })

    return result


def get_nav_summary() -> dict:
    """Return a summary of all available NAV data."""
    available = nav_files_available()
    summary   = {}
    for code, name, path in available:
        rets = get_fund_monthly_returns(code)
        if rets:
            summary[name] = {
                "scheme_code": code,
                "months":      len(rets),
                "start":       f"{rets[0]['year']}-{rets[0]['month']:02d}",
                "end":         f"{rets[-1]['year']}-{rets[-1]['month']:02d}",
                "latest_nav":  rets[-1]["nav_end"],
            }
    return summary
