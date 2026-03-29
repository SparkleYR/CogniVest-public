# Asset registry
#
# Single source of truth for every asset class the digital twin supports.
# Each asset class defines:
#   - category / sub_category
#   - liquidity (1=daily, 2=monthly, 3=quarterly, 4=locked)
#   - return_model: how returns are computed
#   - volatility_prior: annualised sigma estimate when no history available
#   - tax_treatment: short_term / long_term / exempt / special
#   - lock_in_years: mandatory holding period (0 = none)
#   - valuation_source: where to get prices / NAV

ASSET_REGISTRY = {

    # ── Mutual Funds ──────────────────────────────────────────────────────
    "MF:Equity:Large Cap": {
        "category": "Equity", "sub": "Mutual Fund",
        "liquidity": 1, "vol_prior": 0.14, "lock_in": 0,
        "return_model": "nav_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "AMFI / mfapi.in",
    },
    "MF:Equity:Mid Cap": {
        "category": "Equity", "sub": "Mutual Fund",
        "liquidity": 1, "vol_prior": 0.18, "lock_in": 0,
        "return_model": "nav_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "AMFI / mfapi.in",
    },
    "MF:Equity:Small Cap": {
        "category": "Equity", "sub": "Mutual Fund",
        "liquidity": 1, "vol_prior": 0.22, "lock_in": 0,
        "return_model": "nav_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "AMFI / mfapi.in",
    },
    "MF:Equity:Flexi Cap": {
        "category": "Equity", "sub": "Mutual Fund",
        "liquidity": 1, "vol_prior": 0.17, "lock_in": 0,
        "return_model": "nav_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "AMFI / mfapi.in",
    },
    "MF:Hybrid:Multi Asset": {
        "category": "Hybrid", "sub": "Mutual Fund",
        "liquidity": 1, "vol_prior": 0.10, "lock_in": 0,
        "return_model": "nav_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "AMFI / mfapi.in",
    },
    "MF:Debt:Liquid": {
        "category": "Debt", "sub": "Mutual Fund",
        "liquidity": 1, "vol_prior": 0.01, "lock_in": 0,
        "return_model": "nav_history",
        "tax": {"stcg_rate": "slab", "ltcg_rate": "slab", "ltcg_threshold_days": 1095},
        "source": "AMFI / mfapi.in",
    },
    "MF:Gold ETF": {
        "category": "Gold", "sub": "Mutual Fund",
        "liquidity": 1, "vol_prior": 0.15, "lock_in": 0,
        "return_model": "nav_history",
        "tax": {"stcg_rate": "slab", "ltcg_rate": 0.20, "ltcg_threshold_days": 1095},
        "source": "AMFI / mfapi.in",
    },

    # ── Direct Equity ─────────────────────────────────────────────────────
    "Equity:Direct:Large Cap": {
        "category": "Equity", "sub": "Direct Stock",
        "liquidity": 1, "vol_prior": 0.25, "lock_in": 0,
        "return_model": "price_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "NSE/BSE historical data",
        "notes": "Use NSE index files for cap classification",
    },
    "Equity:Direct:Mid Cap": {
        "category": "Equity", "sub": "Direct Stock",
        "liquidity": 1, "vol_prior": 0.30, "lock_in": 0,
        "return_model": "price_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "NSE/BSE historical data",
    },
    "Equity:Direct:Small Cap": {
        "category": "Equity", "sub": "Direct Stock",
        "liquidity": 1, "vol_prior": 0.38, "lock_in": 0,
        "return_model": "price_history",
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "NSE/BSE historical data",
    },

    # ── NPS ───────────────────────────────────────────────────────────────
    "NPS:Tier1:Equity": {
        "category": "NPS", "sub": "Equity (E)",
        "liquidity": 4, "vol_prior": 0.13, "lock_in": 0,
        "return_model": "nps_nav",
        "tax": {
            "contribution_deduction": "80CCD1+80CCD1B",
            "maturity": "60pct_tax_free_40pct_annuity",
            "stcg_rate": None, "ltcg_rate": None,
        },
        "maturity_age": 60,
        "annuity_pct": 0.40,
        "source": "PFRDA website / NPS Trust",
        "notes": "60% lump sum tax-free at 60; 40% compulsory annuity",
    },
    "NPS:Tier1:Corporate Bond": {
        "category": "NPS", "sub": "Corporate Bond (C)",
        "liquidity": 4, "vol_prior": 0.05, "lock_in": 0,
        "return_model": "nps_nav",
        "tax": {
            "contribution_deduction": "80CCD1+80CCD1B",
            "maturity": "60pct_tax_free_40pct_annuity",
        },
        "maturity_age": 60, "annuity_pct": 0.40,
        "source": "PFRDA website / NPS Trust",
    },
    "NPS:Tier1:Govt Bond": {
        "category": "NPS", "sub": "Govt Bond (G)",
        "liquidity": 4, "vol_prior": 0.03, "lock_in": 0,
        "return_model": "nps_nav",
        "tax": {
            "contribution_deduction": "80CCD1+80CCD1B",
            "maturity": "60pct_tax_free_40pct_annuity",
        },
        "maturity_age": 60, "annuity_pct": 0.40,
        "source": "PFRDA website / NPS Trust",
    },
    "NPS:Tier2": {
        "category": "NPS", "sub": "Tier II (liquid)",
        "liquidity": 1, "vol_prior": 0.12, "lock_in": 0,
        "return_model": "nps_nav",
        "tax": {"stcg_rate": "slab", "ltcg_rate": "slab"},
        "source": "PFRDA website / NPS Trust",
        "notes": "No tax benefit; freely withdrawable",
    },

    # ── PPF ───────────────────────────────────────────────────────────────
    "PPF": {
        "category": "Debt", "sub": "PPF",
        "liquidity": 4, "vol_prior": 0.0, "lock_in": 15,
        "return_model": "guaranteed_rate",
        "guaranteed_rate_source": "Ministry of Finance quarterly",
        "current_rate": 0.071,   # 7.1% p.a. as of 2026
        "tax": {
            "contribution_deduction": "80C",
            "interest": "exempt",
            "maturity": "fully_exempt",
        },
        "partial_withdrawal_after_yr": 7,
        "source": "India Post / bank PPF statements",
        "notes": "EEE instrument. Rate changes quarterly.",
    },

    # ── RBI / Govt Bonds ──────────────────────────────────────────────────
    "RBI:FloatingRateBond": {
        "category": "Debt", "sub": "RBI Bond",
        "liquidity": 3, "vol_prior": 0.01, "lock_in": 7,
        "return_model": "guaranteed_rate",
        "current_rate": 0.0835,   # NSC + 35bps, resets every 6 months
        "rate_basis": "NSC + 35bps, resets biannually",
        "tax": {"interest": "taxable_as_income", "ltcg_rate": None},
        "source": "RBI retail direct / bank",
        "notes": "Non-transferable. Interest taxable at slab rate.",
    },
    "GovtSecurities:SGrB": {
        "category": "Debt", "sub": "Sovereign Green Bond",
        "liquidity": 2, "vol_prior": 0.04, "lock_in": 0,
        "return_model": "price_plus_coupon",
        "tax": {"ltcg_rate": 0.10, "stcg_rate": "slab", "ltcg_threshold_days": 365},
        "source": "RBI Retail Direct",
    },

    # ── Corporate Bonds ───────────────────────────────────────────────────
    "Bonds:Corporate:AAA": {
        "category": "Debt", "sub": "Corporate Bond",
        "liquidity": 2, "vol_prior": 0.04, "lock_in": 0,
        "return_model": "price_plus_coupon",
        "credit_rating": "AAA",
        "tax": {"ltcg_rate": 0.10, "stcg_rate": "slab", "ltcg_threshold_days": 365},
        "source": "BSE / NSE bond platform",
    },
    "Bonds:Corporate:AA": {
        "category": "Debt", "sub": "Corporate Bond",
        "liquidity": 2, "vol_prior": 0.06, "lock_in": 0,
        "return_model": "price_plus_coupon",
        "credit_rating": "AA",
        "tax": {"ltcg_rate": 0.10, "stcg_rate": "slab", "ltcg_threshold_days": 365},
        "source": "BSE / NSE bond platform",
    },

    # ── Gold ──────────────────────────────────────────────────────────────
    "Gold:SGB": {
        "category": "Gold", "sub": "Sovereign Gold Bond",
        "liquidity": 3, "vol_prior": 0.15, "lock_in": 8,
        "return_model": "gold_price_plus_coupon",
        "coupon_rate": 0.025,   # 2.5% p.a. on issue price
        "tax": {
            "interest": "taxable_as_income",
            "maturity_capital_gain": "exempt_if_held_to_maturity",
            "ltcg_rate": 0.20,
        },
        "early_exit_after_yr": 5,
        "source": "RBI / BSE SGB series prices",
    },
    "Gold:Physical": {
        "category": "Gold", "sub": "Physical Gold",
        "liquidity": 3, "vol_prior": 0.15, "lock_in": 0,
        "return_model": "gold_price",
        "tax": {"stcg_rate": "slab", "ltcg_rate": 0.20, "ltcg_threshold_days": 1095},
        "source": "MCX / London fix (INR adjusted)",
    },

    # ── REITs / InvITs ────────────────────────────────────────────────────
    "REIT": {
        "category": "Real Estate", "sub": "REIT",
        "liquidity": 1, "vol_prior": 0.18, "lock_in": 0,
        "return_model": "nav_plus_distribution",
        "distribution_yield_avg": 0.065,   # ~6.5% distribution yield
        "tax": {
            "dividend": "taxable_as_income",
            "capital_gain_ltcg": 0.10,
            "ltcg_threshold_days": 365,
        },
        "source": "BSE / NSE REIT NAV",
        "notes": "Embassy, Mindspace, Brookfield listed on NSE",
    },
    "InvIT": {
        "category": "Infrastructure", "sub": "InvIT",
        "liquidity": 1, "vol_prior": 0.20, "lock_in": 0,
        "return_model": "nav_plus_distribution",
        "distribution_yield_avg": 0.08,
        "tax": {
            "dividend": "taxable_as_income",
            "capital_gain_ltcg": 0.10,
            "ltcg_threshold_days": 365,
        },
        "source": "BSE / NSE InvIT NAV",
    },

    # ── PMS / SIF ─────────────────────────────────────────────────────────
    "PMS": {
        "category": "Equity", "sub": "PMS",
        "liquidity": 3, "vol_prior": 0.22, "lock_in": 0,
        "return_model": "custom_report",
        "min_investment": 5000000,   # SEBI minimum 50L
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "PMS manager quarterly report",
        "notes": "No standardised data feed. Ingest from PDF report.",
    },
    "SIF": {
        "category": "Equity", "sub": "SIF (Specialised Investment Fund)",
        "liquidity": 3, "vol_prior": 0.25, "lock_in": 0,
        "return_model": "custom_report",
        "min_investment": 1000000,   # SEBI minimum 10L
        "tax": {"stcg_rate": 0.20, "ltcg_rate": 0.125, "ltcg_threshold_days": 365},
        "source": "SIF manager report",
        "notes": "New SEBI category 2024. Limited data availability.",
    },

    # ── Fixed Deposits ────────────────────────────────────────────────────
    "FD:Bank": {
        "category": "Debt", "sub": "Bank FD",
        "liquidity": 2, "vol_prior": 0.0, "lock_in": 0,
        "return_model": "guaranteed_rate",
        "tax": {"interest": "taxable_as_income", "tds": 0.10},
        "source": "Client statement / bank portal",
    },
    "FD:TaxSaver": {
        "category": "Debt", "sub": "Tax Saver FD",
        "liquidity": 4, "vol_prior": 0.0, "lock_in": 5,
        "return_model": "guaranteed_rate",
        "tax": {"contribution_deduction": "80C", "interest": "taxable_as_income"},
        "source": "Client statement / bank portal",
    },
}


def get_asset_info(asset_type: str) -> dict:
    """Return registry entry for an asset type, or empty dict if unknown."""
    return ASSET_REGISTRY.get(asset_type, {})


def get_vol_prior(asset_type: str) -> float:
    """Return annualised volatility prior for an asset type."""
    info = ASSET_REGISTRY.get(asset_type, {})
    return info.get("vol_prior", 0.16)


def get_all_categories() -> dict:
    """Return grouped asset types by category."""
    groups = {}
    for key, info in ASSET_REGISTRY.items():
        cat = info.get("category", "Other")
        groups.setdefault(cat, []).append(key)
    return groups


def get_liquidity_score(asset_type: str) -> int:
    """1=daily liquid, 2=monthly, 3=quarterly, 4=locked."""
    return ASSET_REGISTRY.get(asset_type, {}).get("liquidity", 1)


def get_guaranteed_rate(asset_type: str) -> float | None:
    """Return guaranteed annual return rate for fixed-return instruments."""
    info = ASSET_REGISTRY.get(asset_type, {})
    if info.get("return_model") == "guaranteed_rate":
        return info.get("current_rate")
    return None
