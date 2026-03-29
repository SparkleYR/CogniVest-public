# reference_data.py
# All static reference data for the digital twin engine
# Sources: RBI, NSE, PFRDA, Value Research, goldpriceindia.com
# Last updated: March 25, 2026

# ── PPF Interest Rate History ─────────────────────────────────────────────
# Source: Ministry of Finance / finmin.nic.in
# Full history from docx file provided

PPF_RATES = [
    # (from_year, from_quarter, to_year, to_quarter, rate_pct)
    # Most recent first
    {"period": "2021-2026",    "rate_pct": 7.1,  "note": "Stable since Apr 2020"},
    {"period": "Jul-Dec 2019", "rate_pct": 7.9},
    {"period": "Oct 2018 - Jun 2019", "rate_pct": 8.0},
    {"period": "Jan-Sep 2018", "rate_pct": 7.6},
    {"period": "Jul-Dec 2017", "rate_pct": 7.8},
    {"period": "Apr-Jun 2017", "rate_pct": 7.9},
    {"period": "Oct 2016 - Mar 2017", "rate_pct": 8.0},
    {"period": "Apr-Sep 2016", "rate_pct": 8.1},
    {"period": "2015-16",      "rate_pct": 8.7},
    {"period": "2014-15",      "rate_pct": 8.7},
    {"period": "2013-14",      "rate_pct": 8.7},
    {"period": "2012-13",      "rate_pct": 8.8},
    {"period": "Dec 2011 - Mar 2012", "rate_pct": 8.6},
    {"period": "Mar 2003 - Nov 2011", "rate_pct": 8.0},
    {"period": "Mar 2002 - Feb 2003", "rate_pct": 9.0},
    {"period": "Mar 2001 - Feb 2002", "rate_pct": 9.5},
    {"period": "Jan 2000 - Feb 2001", "rate_pct": 11.0},
    {"period": "1986 - Jan 2000",     "rate_pct": 12.0},
]

PPF_CURRENT_RATE = 7.1  # FY 2025-26

def get_ppf_rate(year: int) -> float:
    """Return PPF rate for a given year."""
    if year >= 2020: return 7.1
    if year >= 2019: return 7.9
    if year >= 2018: return 7.6
    if year >= 2016: return 8.1
    if year >= 2015: return 8.7
    if year >= 2012: return 8.7
    if year >= 2003: return 8.0
    return 8.0  # default

# ── Gold Price History (India, 24K per 10g in INR) ───────────────────────
# Source: goldpriceindia.com screenshot (March 24 each year)

GOLD_PRICES_INR = {
    2026: 139770,
    2025: 87322,
    2024: 65870,
    2023: 59724,
    2022: 52063,
    2021: 44728,
    2020: 41273,
    2019: 32152,
    2018: 30907,
    2017: 28796,
    2016: 28588,
    2015: 26300,
    2014: 29178,
    2013: 29698,
    2012: 27651,
    2011: 20975,
    2010: 16455,
    2009: 15425,
}

def get_gold_cagr(from_year: int, to_year: int = 2026) -> float:
    """Compute gold CAGR between two years."""
    if from_year not in GOLD_PRICES_INR or to_year not in GOLD_PRICES_INR:
        return 0.0
    years = to_year - from_year
    if years <= 0: return 0.0
    return ((GOLD_PRICES_INR[to_year] / GOLD_PRICES_INR[from_year]) ** (1/years) - 1) * 100

# Pre-computed gold CAGRs
GOLD_CAGR_1YR  = round(get_gold_cagr(2025, 2026), 2)   # 60.1%
GOLD_CAGR_3YR  = round(get_gold_cagr(2023, 2026), 2)   # 32.7%
GOLD_CAGR_5YR  = round(get_gold_cagr(2021, 2026), 2)   # 25.6%
GOLD_CAGR_10YR = round(get_gold_cagr(2016, 2026), 2)   # 17.2%

# ── CPI Inflation (Monthly % variation, Combined All India) ───────────────
# Source: RBI Handbook of Statistics Table 242

CPI_ANNUAL_AVG = {
    # Financial year: avg inflation %
    "2019-20": 4.8,
    "2020-21": 6.2,
    "2021-22": 5.5,
    "2022-23": 6.7,
    "2023-24": 5.4,
    "2024-25": 4.9,
    "2025-26": 3.1,  # partial year (Apr-Jul 2025)
}

CPI_MONTHLY = {
    # (year, month) : inflation %  — Combined All India
    (2024, 4): 4.8, (2024, 5): 4.8, (2024, 6): 5.1,
    (2024, 7): 3.5, (2024, 8): 3.7, (2024, 9): 5.5,
    (2024,10): 6.2, (2024,11): 5.5, (2024,12): 5.2,
    (2025, 1): 4.3, (2025, 2): 3.6, (2025, 3): 3.3,
    (2025, 4): 3.3, (2025, 5): 3.2, (2025, 6): 3.0,
    (2025, 7): 2.8,
}

CURRENT_CPI = 3.3  # Latest available (Apr 2025)

def get_real_return(nominal_return_pct: float, year: str = "2024-25") -> float:
    """Convert nominal return to real return after inflation."""
    inflation = CPI_ANNUAL_AVG.get(year, CURRENT_CPI)
    return round(((1 + nominal_return_pct/100) / (1 + inflation/100) - 1) * 100, 2)

# ── NPS Scheme NAV & Returns ──────────────────────────────────────────────
# Source: Scheme_NAV_1D_7D_1M_3M_6M_1Y_3Y_5Y.docx (PFRDA data)
# Date: March 25, 2026

NPS_SCHEMES = {
    # Scheme E (Equity) — Tier I
    "KOTAK_E_T1":   {"nav": 62.41, "1d": -2.81, "1m": -12.15, "3m": -13.07, "1y": -0.78,  "3y": 13.58, "5y": 11.93, "tier": "I",  "type": "E"},
    "ICICI_E_T1":   {"nav": 67.33, "1d": -3.00, "1m": -12.02, "3m": -12.78, "1y": -1.33,  "3y": 14.00, "5y": 11.94, "tier": "I",  "type": "E"},
    "UTI_E_T1":     {"nav": 65.50, "1d": -2.82, "1m": -12.41, "3m": -13.28, "1y": -2.58,  "3y": 13.45, "5y": 11.65, "tier": "I",  "type": "E"},
    "HDFC_E_T1":    {"nav": 49.86, "1d": -2.73, "1m": -11.82, "3m": -12.05, "1y":  0.02,  "3y": 13.00, "5y": 11.36, "tier": "I",  "type": "E"},
    "LIC_E_T1":     {"nav": 41.51, "1d": -2.73, "1m": -12.25, "3m": -12.41, "1y": -0.97,  "3y": 12.23, "5y": 11.40, "tier": "I",  "type": "E"},
    "SBI_E_T1":     {"nav": 48.05, "1d": -2.79, "1m": -11.63, "3m": -12.44, "1y": -3.09,  "3y": 11.04, "5y":  9.97, "tier": "I",  "type": "E"},
    "ABSLI_E_T1":   {"nav": 26.23, "1d": -2.87, "1m": -11.48, "3m": -12.41, "1y": -1.58,  "3y": 12.44, "5y": 10.72, "tier": "I",  "type": "E"},
    # Scheme E (Equity) — Tier II
    "KOTAK_E_T2":   {"nav": 54.92, "1d": -2.80, "1m": -11.91, "3m": -12.99, "1y": -0.47,  "3y": 13.61, "5y": 11.94, "tier": "II", "type": "E"},
    "ICICI_E_T2":   {"nav": 53.27, "1d": -2.97, "1m": -11.93, "3m": -12.56, "1y": -0.84,  "3y": 13.93, "5y": 11.93, "tier": "II", "type": "E"},
    "HDFC_E_T2":    {"nav": 43.00, "1d": -2.76, "1m": -11.90, "3m": -12.25, "1y": -0.26,  "3y": 12.98, "5y": 11.32, "tier": "II", "type": "E"},
    "UTI_E_T2":     {"nav": 52.33, "1d": -2.78, "1m": -12.59, "3m": -13.42, "1y": -2.09,  "3y": 12.55, "5y": 11.03, "tier": "II", "type": "E"},
    "ABSLI_E_T2":   {"nav": 26.53, "1d": -2.87, "1m": -11.29, "3m": -12.43, "1y": -1.38,  "3y": 12.96, "5y": 11.05, "tier": "II", "type": "E"},
    "LIC_E_T2":     {"nav": 34.52, "1d": -2.74, "1m": -12.24, "3m": -12.49, "1y": -1.11,  "3y": 11.94, "5y": 11.23, "tier": "II", "type": "E"},
    "SBI_E_T2":     {"nav": 48.05, "1d": -2.79, "1m": -11.63, "3m": -12.44, "1y": -3.09,  "3y": 11.04, "5y":  9.97, "tier": "II", "type": "E"},
}

# NPS Scheme E averages (computed from above)
NPS_SCHEME_E_AVG_1Y  = round(sum(s["1y"] for s in NPS_SCHEMES.values()) / len(NPS_SCHEMES), 2)
NPS_SCHEME_E_AVG_3Y  = round(sum(s["3y"] for s in NPS_SCHEMES.values()) / len(NPS_SCHEMES), 2)
NPS_SCHEME_E_AVG_5Y  = round(sum(s["5y"] for s in NPS_SCHEMES.values()) / len(NPS_SCHEMES), 2)

def get_nps_benchmark(fund_manager: str = None, tier: str = "I") -> dict:
    """Get NPS Scheme E benchmarks. Use best performer if no manager specified."""
    tier_schemes = {k: v for k, v in NPS_SCHEMES.items() if v["tier"] == tier}
    if fund_manager:
        key = f"{fund_manager.upper()}_E_T{tier[-1]}"
        return NPS_SCHEMES.get(key, {})
    # Return category averages
    return {
        "avg_1y_return": NPS_SCHEME_E_AVG_1Y,
        "avg_3y_return": NPS_SCHEME_E_AVG_3Y,
        "avg_5y_return": NPS_SCHEME_E_AVG_5Y,
        "best_5y_fund":  max(tier_schemes, key=lambda k: tier_schemes[k]["5y"]),
        "best_5y_return": max(v["5y"] for v in tier_schemes.values()),
    }

# ── MF Category Average Returns (Value Research, Mar 25 2026) ────────────

MF_CATEGORY_AVERAGES = {
    # Equity
    "EQ-LC":      {"name": "Large Cap",         "1y_avg": -2.07, "risk": "Very High"},
    "EQ-MC":      {"name": "Mid Cap",            "1y_avg":  0.83, "risk": "Very High"},
    "EQ-SC":      {"name": "Small Cap",          "1y_avg": -4.51, "risk": "Very High"},
    "EQ-FLX":     {"name": "Flexi Cap",          "1y_avg": -2.06, "risk": "Very High"},
    "EQ-MLC":     {"name": "Multi Cap",          "1y_avg": -1.52, "risk": "Very High"},
    "EQ-L&MC":    {"name": "Large & Mid Cap",    "1y_avg": -1.42, "risk": "Very High"},
    "EQ-ELSS":    {"name": "ELSS (Tax Saving)",  "1y_avg": -2.65, "risk": "Very High"},
    "EQ-VAL":     {"name": "Value / Contra",     "1y_avg":  1.85, "risk": "Very High"},
    "EQ-THEMATIC":{"name": "Thematic",           "1y_avg": -0.36, "risk": "Very High"},
    "EQ-BANK":    {"name": "Banking Sector",     "1y_avg":  5.38, "risk": "Very High"},
    "EQ-IT":      {"name": "IT Sector",          "1y_avg":-15.21, "risk": "Very High"},
    "EQ-Pharma":  {"name": "Pharma Sector",      "1y_avg":  0.26, "risk": "Very High"},
    "EQ-SA&T":    {"name": "Auto Sector",        "1y_avg":  7.95, "risk": "Very High"},
    # Hybrid
    "HY-MAA":     {"name": "Multi Asset Allocation", "1y_avg": 10.06, "risk": "High"},
    "HY-AH":      {"name": "Aggressive Hybrid",  "1y_avg":  0.93, "risk": "Very High"},
    "HY-CH":      {"name": "Conservative Hybrid","1y_avg":  3.75, "risk": "Moderately High"},
    "HY-AR":      {"name": "Arbitrage",          "1y_avg":  6.75, "risk": "Low"},
    "HY-DAA":     {"name": "Dynamic Asset Alloc","1y_avg":  1.48, "risk": "Very High"},
    "HY-EQ S":    {"name": "Equity Savings",     "1y_avg":  4.82, "risk": "Moderately High"},
    # Debt
    "DT-LIQ":     {"name": "Liquid",             "1y_avg":  5.93, "risk": "Low to Moderate"},
    "DT-OVERNHT": {"name": "Overnight",          "1y_avg":  5.45, "risk": "Low"},
    "DT-MM":      {"name": "Money Market",       "1y_avg":  6.88, "risk": "Low to Moderate"},
    "DT-SD":      {"name": "Short Duration",     "1y_avg":  6.65, "risk": "Moderate"},
    "DT-MD":      {"name": "Medium Duration",    "1y_avg":  7.05, "risk": "Moderate"},
    "DT-LD":      {"name": "Low Duration",       "1y_avg":  7.04, "risk": "Low to Moderate"},
    "DT-TM":      {"name": "Target Maturity",    "1y_avg":  6.72, "risk": "Moderate"},
    "DT-GL":      {"name": "Gilt",               "1y_avg":  2.88, "risk": "Moderate"},
    "DT-CB":      {"name": "Corporate Bond",     "1y_avg":  6.48, "risk": "Moderate"},
    "DT-CR":      {"name": "Credit Risk",        "1y_avg":  9.23, "risk": "Moderately High"},
    "DT-Floater": {"name": "Floater",            "1y_avg":  7.15, "risk": "Moderate"},
    "DT-BK & PSU":{"name": "Banking & PSU",      "1y_avg":  6.31, "risk": "Moderate"},
}

def get_category_avg(category_code: str) -> dict:
    """Get category average return for a fund category."""
    return MF_CATEGORY_AVERAGES.get(category_code, {})

def get_fund_vs_category(fund_1y_return: float, category_code: str) -> dict:
    """Compare a fund's return against its category average."""
    cat = MF_CATEGORY_AVERAGES.get(category_code, {})
    if not cat:
        return {"comparison": "category not found"}
    cat_avg = cat["1y_avg"]
    alpha   = round(fund_1y_return - cat_avg, 2)
    return {
        "fund_return":    fund_1y_return,
        "category_avg":  cat_avg,
        "category_name": cat["name"],
        "alpha_vs_cat":  alpha,
        "outperforming": alpha > 0,
        "verdict": f"{'Outperforming' if alpha > 0 else 'Underperforming'} category by {abs(alpha):.2f}%"
    }

# ── Summary stats (useful for advisor dashboard) ─────────────────────────

MARKET_SNAPSHOT = {
    "as_of": "March 25, 2026",
    "gold_price_per_10g":    139770,
    "gold_1yr_return_pct":   GOLD_CAGR_1YR,
    "gold_5yr_cagr_pct":     GOLD_CAGR_5YR,
    "ppf_current_rate_pct":  PPF_CURRENT_RATE,
    "cpi_latest_pct":        CURRENT_CPI,
    "nps_e_avg_3y_pct":      NPS_SCHEME_E_AVG_3Y,
    "nps_e_avg_5y_pct":      NPS_SCHEME_E_AVG_5Y,
    "equity_large_cap_1y":   MF_CATEGORY_AVERAGES["EQ-LC"]["1y_avg"],
    "equity_mid_cap_1y":     MF_CATEGORY_AVERAGES["EQ-MC"]["1y_avg"],
    "equity_small_cap_1y":   MF_CATEGORY_AVERAGES["EQ-SC"]["1y_avg"],
    "liquid_fund_1y":        MF_CATEGORY_AVERAGES["DT-LIQ"]["1y_avg"],
}

# ── Corporate Bond Yields (NSE Nifty Bond Indices, Feb 28, 2026) ──────────
# Source: NSE Indexogram factsheets uploaded by user
# Key: avg yield % as of Feb 28, 2026 (use for corporate bond valuation)

BOND_YIELDS = {
    # AAA rated (safest corporate bonds)
    "AAA": {
        "ultra_short": {"yield": 7.34, "duration": 0.22, "1y_return": 6.74},
        "low_duration": {"yield": 7.16, "duration": 0.66, "1y_return": 6.82},
        "short":        {"yield": 7.02, "duration": 1.75, "1y_return": 7.18},
        "medium":       {"yield": 7.18, "duration": 3.55, "1y_return": 6.69},
        "medium_long":  {"yield": 7.29, "duration": 5.35, "1y_return": 5.14},
        "long":         {"yield": 7.31, "duration": 8.44, "1y_return": 1.84},
    },
    # AA+ rated
    "AA_plus": {
        "ultra_short": {"yield": 7.23, "duration": 0.19, "1y_return": 7.13},
        "short":       {"yield": 7.67, "duration": 1.96, "1y_return": 7.20},
        "medium":      {"yield": 7.77, "duration": 3.35, "1y_return": 5.86},
        "long":        {"yield": 9.74, "duration": 7.69, "1y_return": -0.78},
    },
    # AA rated
    "AA": {
        "ultra_short": {"yield": 8.46, "duration": 0.25, "1y_return": 7.70},
        "short":       {"yield": 8.45, "duration": 1.71, "1y_return": 7.36},
        "medium":      {"yield": 8.08, "duration": 3.46, "1y_return": 4.91},
        "long":        {"yield": 8.79, "duration": 7.49, "1y_return": -0.88},
    },
    # AA- rated (higher yield, higher risk)
    "AA_minus": {
        "ultra_short": {"yield": 9.16, "duration": 0.24, "1y_return": 9.34},
        "short":       {"yield": 9.19, "duration": 1.62, "1y_return": 8.02},
        "medium":      {"yield": 9.52, "duration": 3.43, "1y_return": 7.22},
        "long":        {"yield": 8.29, "duration": 7.84, "1y_return": -7.25},
    },
    # Banking & PSU bonds
    "BANKING_PSU": {
        "ultra_short": {"yield": 7.37, "duration": 0.16, "1y_return": 7.07},
        "short":       {"yield": 7.13, "duration": 1.96, "1y_return": 7.78},
        "medium":      {"yield": 7.18, "duration": 3.51, "1y_return": 7.40},
        "long":        {"yield": 7.35, "duration": 8.49, "1y_return": 4.97},
    },
    # A rated (lower quality, higher yield)
    "A": {
        "short":       {"yield": 10.18, "duration": 1.51, "1y_return": 5.59},
        "long":        {"yield": 11.89, "duration": 3.89, "1y_return": -1.02},
    },
}

# REIT listing data (from screenshot)
REIT_LISTINGS = {
    "EMBASSY": {
        "name":         "Embassy Office Parks REIT",
        "listed":       "2019-04-01",
        "issue_price":  300,
        "type":         "Office",
        "nse_symbol":   "EMBASSY",
    },
    "MINDSPACE": {
        "name":         "Mindspace Business Parks REIT",
        "listed":       "2020-08-07",
        "issue_price":  275,
        "type":         "Office",
        "nse_symbol":   "MINDSPACE",
    },
    "BIRET": {
        "name":         "Brookfield India Real Estate Trust",
        "listed":       "2021-02-16",
        "issue_price":  275,
        "type":         "Office",
        "nse_symbol":   "BIRET",
    },
    "NXST": {
        "name":         "Nexus Select Trust",
        "listed":       "2023-05-19",
        "issue_price":  100,
        "type":         "Retail",
        "nse_symbol":   "NXST",
    },
    "KRT": {
        "name":         "Knowledge Realty Trust",
        "listed":       "2025-08-18",
        "issue_price":  100,
        "type":         "Office",
        "nse_symbol":   "KRT",
    },
}

# USD/INR current rate (from RBI data)
USD_INR_CURRENT = 93.88
GBP_INR_CURRENT = 125.83
EUR_INR_CURRENT = 108.74

def get_bond_yield(rating: str, duration: str = "short") -> float:
    """Get current yield for a bond by rating and duration."""
    rating_map = {
        "AAA": "AAA", "AA+": "AA_plus", "AA": "AA",
        "AA-": "AA_minus", "A": "A", "Banking PSU": "BANKING_PSU"
    }
    key = rating_map.get(rating, "AAA")
    bucket = BOND_YIELDS.get(key, {}).get(duration, {})
    return bucket.get("yield", 7.5)

def get_fx_rate(currency: str = "USD") -> float:
    """Get current INR exchange rate."""
    rates = {"USD": USD_INR_CURRENT, "GBP": GBP_INR_CURRENT, "EUR": EUR_INR_CURRENT}
    return rates.get(currency.upper(), USD_INR_CURRENT)
