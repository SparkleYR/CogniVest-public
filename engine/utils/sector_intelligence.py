# Sector Intelligence Module
#
# Built from official NSE Indexogram data (February 27, 2026)
# Covers 5 sector indices: Bank, IT, FMCG, Auto, Pharma
#
# Provides:
#   get_stock_sector(symbol)          -- which sector does this stock belong to
#   get_sector_stats()                -- 1yr/5yr returns, beta, volatility per sector
#   classify_portfolio_sectors(assets)-- sector breakdown of a portfolio
#   sector_concentration_flags(breakdown) -- flag overweight sectors

import csv, os
from pathlib import Path

DATA_DIR = str(Path(__file__).resolve().parent.parent / 'data')

# ── Sector statistics from NSE PDFs (Feb 27, 2026) ─────────────────────────
# Source: Official NSE Indexogram factsheets
SECTOR_STATS = {
    "Banking & Financial Services": {
        "index":           "Nifty Bank",
        "constituents":    14,
        "return_1yr_pct":  25.20,   # Price Return
        "return_5yr_pct":  11.70,
        "total_return_1yr": 26.20,
        "volatility_1yr":  12.06,
        "volatility_5yr":  17.12,
        "beta_nifty50":    0.89,
        "correlation_nifty50": 0.89,
        "pe_ratio":        16.21,
        "pb_ratio":        2.11,
        "dividend_yield":  0.97,
        "characteristic":  "High beta, cyclical, correlated with rates",
        "top_stocks":      ["HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK"],
    },
    "Information Technology": {
        "index":           "Nifty IT",
        "constituents":    10,
        "return_1yr_pct":  -17.99,  # correction year
        "return_5yr_pct":  4.72,
        "total_return_1yr": -16.06,
        "volatility_1yr":  22.42,
        "volatility_5yr":  21.02,
        "beta_nifty50":    1.12,
        "correlation_nifty50": 0.60,
        "pe_ratio":        21.74,
        "pb_ratio":        5.68,
        "dividend_yield":  3.46,
        "characteristic":  "USD revenue, high vol, global macro sensitive",
        "top_stocks":      ["INFY", "TCS", "HCLTECH", "TECHM", "WIPRO"],
    },
    "FMCG": {
        "index":           "Nifty FMCG",
        "constituents":    15,
        "return_1yr_pct":  0.89,
        "return_5yr_pct":  9.53,
        "total_return_1yr": 2.37,
        "volatility_1yr":  12.95,
        "volatility_5yr":  13.67,
        "beta_nifty50":    0.62,
        "correlation_nifty50": 0.57,
        "pe_ratio":        36.89,
        "pb_ratio":        9.16,
        "dividend_yield":  1.61,
        "characteristic":  "Defensive, low beta, inflation hedge, premium valuations",
        "top_stocks":      ["ITC", "HINDUNILVR", "NESTLEIND", "TATACONSUM", "BRITANNIA"],
    },
    "Automobiles": {
        "index":           "Nifty Auto",
        "constituents":    15,
        "return_1yr_pct":  37.37,   # strong year
        "return_5yr_pct":  22.59,
        "total_return_1yr": 38.80,
        "volatility_1yr":  17.36,
        "volatility_5yr":  18.71,
        "beta_nifty50":    1.13,
        "correlation_nifty50": 0.78,
        "pe_ratio":        33.29,
        "pb_ratio":        4.83,
        "dividend_yield":  1.13,
        "characteristic":  "Cyclical, high beta, EV transition theme, rural demand play",
        "top_stocks":      ["M&M", "MARUTI", "BAJAJ-AUTO", "EICHERMOT", "TVSMOTOR"],
    },
    "Pharmaceuticals": {
        "index":           "Nifty Pharma",
        "constituents":    20,
        "return_1yr_pct":  15.84,
        "return_5yr_pct":  13.99,
        "total_return_1yr": 16.68,
        "volatility_1yr":  15.10,
        "volatility_5yr":  15.43,
        "beta_nifty50":    0.79,
        "correlation_nifty50": 0.63,
        "pe_ratio":        34.35,
        "pb_ratio":        5.0,
        "dividend_yield":  0.69,
        "characteristic":  "Defensive growth, US generics exposure, regulatory risk",
        "top_stocks":      ["SUNPHARMA", "DIVISLAB", "DRREDDY", "CIPLA", "LUPIN"],
    },
}

# ── Stock to sector mapping (from constituent CSVs) ────────────────────────
_SECTOR_MAP = None

def _build_sector_map() -> dict:
    """Build symbol → sector lookup from all 5 CSV files."""
    mapping = {}
    files = {
        "Banking & Financial Services": "ind_niftybanklist.csv",
        "Information Technology":       "ind_niftyitlist.csv",
        "FMCG":                         "ind_niftyfmcglist.csv",
        "Automobiles":                  "ind_niftyautolist.csv",
        "Pharmaceuticals":              "ind_niftypharmalist.csv",
    }
    for sector, filename in files.items():
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            continue
        try:
            with open(path, encoding="utf-8") as f:
                for row in csv.DictReader(f):
                    symbol = row.get("Symbol", "").strip()
                    if symbol:
                        mapping[symbol] = sector
        except Exception:
            continue
    return mapping


def get_stock_sector(symbol: str) -> str:
    """Return sector name for a stock symbol. Returns 'Other' if not found."""
    global _SECTOR_MAP
    if _SECTOR_MAP is None:
        _SECTOR_MAP = _build_sector_map()
    return _SECTOR_MAP.get(symbol.upper(), "Other")


def get_all_sector_symbols() -> dict:
    """Return {sector: [symbols]} for all 5 sectors."""
    global _SECTOR_MAP
    if _SECTOR_MAP is None:
        _SECTOR_MAP = _build_sector_map()
    result = {}
    for symbol, sector in _SECTOR_MAP.items():
        result.setdefault(sector, []).append(symbol)
    return result


def get_sector_stats() -> dict:
    """Return full sector statistics dict."""
    return SECTOR_STATS


def classify_portfolio_sectors(assets: list) -> dict:
    """
    Given a list of asset dicts (each with 'metadata.symbol' or 'name'),
    compute sector allocation of equity portion.

    Returns:
        {
            sector_breakdown: {sector: {value, pct, stocks}},
            top_sector: str,
            top_sector_pct: float,
            sector_concentration_flag: bool,
            unknown_pct: float,
        }
    """
    global _SECTOR_MAP
    if _SECTOR_MAP is None:
        _SECTOR_MAP = _build_sector_map()

    sector_values = {}
    total_equity = 0

    for asset in assets:
        # Only classify equity assets
        if asset.get("asset_class") not in ("Equity", "Hybrid"):
            continue

        cv = asset.get("current_value", 0)
        if cv <= 0:
            continue

        # Try to get symbol
        symbol = None
        meta = asset.get("metadata", {})
        if meta.get("symbol"):
            symbol = meta["symbol"].upper()

        # For mutual funds, use sector breakdown if available
        sector_bkdown = asset.get("sector_breakdown", {})
        if sector_bkdown:
            for s, pct in sector_bkdown.items():
                sv = cv * pct / 100
                sector_values[s] = sector_values.get(s, 0) + sv
                total_equity += sv
            continue

        # Direct equity — look up symbol
        if symbol:
            sector = _SECTOR_MAP.get(symbol, "Other")
            sector_values[sector] = sector_values.get(sector, 0) + cv
            total_equity += cv
        else:
            # MF without sector breakdown — use sub_type as proxy
            sub = asset.get("sub_type", "")
            if "Bank" in asset.get("name", "") or "Fin" in asset.get("name", ""):
                sector = "Banking & Financial Services"
            elif "Pharma" in asset.get("name", "") or "Health" in asset.get("name", ""):
                sector = "Pharmaceuticals"
            elif "IT" in asset.get("name", "") or "Tech" in asset.get("name", ""):
                sector = "Information Technology"
            elif "Auto" in asset.get("name", ""):
                sector = "Automobiles"
            elif "FMCG" in asset.get("name", "") or "Consum" in asset.get("name", ""):
                sector = "FMCG"
            else:
                sector = "Diversified"
            sector_values[sector] = sector_values.get(sector, 0) + cv
            total_equity += cv

    if total_equity == 0:
        return {"sector_breakdown": {}, "top_sector": None, "top_sector_pct": 0,
                "sector_concentration_flag": False, "unknown_pct": 100}

    breakdown = {}
    for sector, value in sorted(sector_values.items(), key=lambda x: -x[1]):
        pct = round(value / total_equity * 100, 2)
        stats = SECTOR_STATS.get(sector, {})
        breakdown[sector] = {
            "value":       round(value),
            "pct":         pct,
            "beta":        stats.get("beta_nifty50"),
            "volatility":  stats.get("volatility_5yr"),
            "1yr_return":  stats.get("return_1yr_pct"),
            "characteristic": stats.get("characteristic", ""),
        }

    top_sector     = max(breakdown, key=lambda s: breakdown[s]["pct"]) if breakdown else None
    top_sector_pct = breakdown[top_sector]["pct"] if top_sector else 0
    unknown_pct    = round(breakdown.get("Other", {}).get("pct", 0) + 
                           breakdown.get("Diversified", {}).get("pct", 0), 2)

    flags = []
    if top_sector_pct > 40:
        flags.append({
            "type": "sector_concentration",
            "severity": "warning",
            "message": f"{top_sector} is {top_sector_pct}% of equity — heavily concentrated in one sector"
        })
    if "Banking & Financial Services" in breakdown and breakdown["Banking & Financial Services"]["pct"] > 35:
        flags.append({
            "type": "bank_heavy",
            "severity": "info",
            "message": "Portfolio is very bank-heavy. Banking sector has beta 0.89 — highly correlated with Nifty 50."
        })
    if "Information Technology" in breakdown and breakdown["Information Technology"]["pct"] > 30:
        flags.append({
            "type": "it_concentration",
            "severity": "info",
            "message": "High IT allocation — IT sector returned -18% in last 1 year. High USD/INR sensitivity."
        })

    return {
        "sector_breakdown":          breakdown,
        "top_sector":                top_sector,
        "top_sector_pct":            top_sector_pct,
        "sector_concentration_flag": top_sector_pct > 40,
        "unknown_pct":               unknown_pct,
        "flags":                     flags,
        "total_equity_classified":   round(total_equity),
    }


def get_sector_comparison_for_advisor() -> list:
    """
    Returns sector stats sorted by 1yr return — useful for advisor dashboard.
    Shows which sectors are hot vs cold right now.
    """
    result = []
    for sector, stats in SECTOR_STATS.items():
        result.append({
            "sector":       sector,
            "index":        stats["index"],
            "return_1yr":   stats["return_1yr_pct"],
            "return_5yr":   stats["return_5yr_pct"],
            "volatility":   stats["volatility_5yr"],
            "beta":         stats["beta_nifty50"],
            "pe":           stats["pe_ratio"],
            "characteristic": stats["characteristic"],
        })
    return sorted(result, key=lambda x: -x["return_1yr"])
