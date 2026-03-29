# Portfolio parser utility
#
# Converts raw portfolio data into the standardised dict expected by all agents.
# Provides:
#   parse_client()     -- pre-parsed client portfolio (Investment Times PDF)
#   parse_from_dict()  -- build portfolio from a manually structured dict

_CLIENT_WEIGHTS = {
    118989: 0.2219,
    120586: 0.3520,
    152703: 0.1866,
    120503: 0.1550,
    150627: 0.0838,
    150622: 0.0007,
}


def _load_portfolio_returns() -> list:
    try:
        from utils.nav_loader import get_portfolio_monthly_returns
        rets = get_portfolio_monthly_returns(_CLIENT_WEIGHTS)
        return [r["return_pct"] for r in rets]
    except Exception:
        return []



def parse_client() -> dict:
    """
    Fully structured portfolio dict for the demo client.
    Source: Investment Times valuation report, 11-Feb-2026.

    XIRR note:
      PDF reports portfolio XIRR = 12.65%, computed from full transaction history
      (not available here). We store it under reported.xirr_pct for display.
      Scheme-level CAGRs below match the PDF exactly and are authoritative.
      Portfolio-level XIRR from all_cashflows is an approximation only.
    """
    return {
        "client": {
            "name":        "Demo Client",
            "pan":         "XXXXXXXXXX",
            "since":       "2011-09-21",
            "rm":          "Gulshan Khurana",
            "distributor": "Investment Times",
        },

        # PDF-reported figures -- used for display, not recomputed
        "reported": {
            "xirr_pct":       12.65,
            "net_investment": 4226340,
            "current_value":  5985982,
            "overall_gain":   1759642,
            "total_invested": 4948999,
            "total_redeemed":  722649,
            "valuation_date": "2026-02-11",
        },

        # Approximated cashflows for portfolio-level XIRR
        # Replace with full transaction-level data for exact 12.65%
        "all_cashflows": [
            {"date": "2023-08-27", "amount": -683839},
            {"date": "2023-10-05", "amount": -886500},
            {"date": "2024-04-15", "amount": -720415},
            {"date": "2025-03-13", "amount": -1829893},
            {"date": "2025-10-02", "amount": -3903},
            {"date": "2025-11-24", "amount": -500000},
            {"date": "2026-02-11", "amount":  5985982},
        ],

        "target_allocation": {
            "Equity": 65.0,
            "Hybrid": 20.0,
            "Debt":   10.0,
            "Gold":    5.0,
        },

        "nav_series":      [],   # fill with monthly NAV for drawdown calc
        "monthly_returns": _load_portfolio_returns(),  # auto-loaded from NAV files

        # ------------------------------------------------------------------
        # Schemes -- CAGR figures match PDF exactly
        # cap_breakdown = fraction of scheme AUM in Large / Mid / Small cap
        # (sourced from AMC factsheets, approximate)
        # ------------------------------------------------------------------
        "schemes": [
            {
                "name":           "Axis Large & Mid Cap Fund Reg (G)",
                "asset_class":    "Equity",
                "sub_category":   "Equity:Large & Mid Cap",
                "cap_breakdown":  {"Large": 0.68, "Mid": 0.30, "Small": 0.02},
                "purchase_value": 720415,
                "current_value":  927969,
                "holding_days":   636,
                "cashflows": [
                    {"date": "2024-04-15", "amount": -720415},
                    {"date": "2026-02-11", "amount":  927969},
                ],
                "sector_breakdown": {
                    "Banking & Financial": 195000,
                    "Software & Services":  90000,
                    "Automobile":           75000,
                    "FMCG":                 50000,
                    "Pharma & Biotech":     45000,
                },
            },
            {
                "name":           "Bajaj Finserv Flexi Cap Fund Reg (G)",
                "asset_class":    "Equity",
                "sub_category":   "Equity:Flexi Cap",
                "cap_breakdown":  {"Large": 0.65, "Mid": 0.25, "Small": 0.10},
                "purchase_value": 500000,
                "current_value":  501745,
                "holding_days":   79,
                "cashflows": [
                    {"date": "2025-11-24", "amount": -500000},
                    {"date": "2026-02-11", "amount":  501745},
                ],
                "sector_breakdown": {
                    "Banking & Financial": 115000,
                    "Software & Services":  80000,
                    "Automobile":           55000,
                },
            },
            {
                "name":           "Bajaj Finserv Liquid Fund Reg (G)",
                "asset_class":    "Debt",
                "sub_category":   "Debt:Liquid",
                "cap_breakdown":  {},
                "purchase_value": 3903,
                "current_value":  3983,
                "holding_days":   132,
                "cashflows": [
                    {"date": "2025-10-02", "amount": -3903},
                    {"date": "2026-02-11", "amount":  3983},
                ],
                "sector_breakdown": {},
            },
            {
                "name":           "ICICI Pru Large Cap Fund Reg (G)",
                "asset_class":    "Equity",
                "sub_category":   "Equity:Large Cap",
                "cap_breakdown":  {"Large": 0.92, "Mid": 0.07, "Small": 0.01},
                "purchase_value": 886500,
                "current_value":  1328101,
                "holding_days":   855,
                "cashflows": [
                    {"date": "2023-10-05", "amount": -886500},
                    {"date": "2026-02-11", "amount": 1328101},
                ],
                "sector_breakdown": {
                    "Banking & Financial": 318000,
                    "Petroleum Products":  135000,
                    "Software & Services": 100000,
                    "Automobile":           90000,
                    "Construction":         80000,
                },
            },
            {
                "name":           "ICICI Pru Multi Asset Fund (G)",
                "asset_class":    "Hybrid",
                "sub_category":   "Hybrid:Multi-Asset",
                "cap_breakdown":  {"Large": 0.60, "Mid": 0.25, "Small": 0.15},
                "purchase_value": 1829893,
                "current_value":  2106965,
                "holding_days":   335,
                "cashflows": [
                    {"date": "2025-03-13", "amount": -1829893},
                    {"date": "2026-02-11", "amount": 2106965},
                ],
                "sector_breakdown": {
                    "Banking & Financial": 420000,
                    "Gold":                 94813,
                    "Petroleum Products":  110000,
                    "Finance & Investments": 88000,
                    "Retail":              111000,
                },
            },
            {
                "name":           "Mirae Asset Nifty India Manufacturing ETF FoF Reg (G)",
                "asset_class":    "Equity",
                "sub_category":   "Equity:Thematic",
                "cap_breakdown":  {"Large": 0.78, "Mid": 0.18, "Small": 0.04},
                "purchase_value": 683839,
                "current_value":  1117217,
                "holding_days":   898,
                "cashflows": [
                    {"date": "2023-08-27", "amount": -683839},
                    {"date": "2026-02-11", "amount": 1117217},
                ],
                "sector_breakdown": {
                    "Automobile":          405438,
                    "Construction":        253705,
                    "Pharma & Biotech":    249324,
                    "Petroleum Products":  132194,
                    "Miscellaneous":        76556,
                },
            },
        ],

        # ------------------------------------------------------------------
        # Holdings flat list -- used by Allocation + Risk agents
        # ------------------------------------------------------------------
        "holdings": [
            {
                "name":            "Axis Large & Mid Cap Fund Reg (G)",
                "asset_class":     "Equity",
                "sub_category":    "Equity:Large & Mid Cap",
                "cap_breakdown":   {"Large": 0.68, "Mid": 0.30, "Small": 0.02},
                "current_value":   927969,
                "sector_breakdown": {
                    "Banking & Financial": 195000,
                    "Software & Services":  90000,
                    "Automobile":           75000,
                },
            },
            {
                "name":            "Bajaj Finserv Flexi Cap Fund Reg (G)",
                "asset_class":     "Equity",
                "sub_category":    "Equity:Flexi Cap",
                "cap_breakdown":   {"Large": 0.65, "Mid": 0.25, "Small": 0.10},
                "current_value":   501745,
                "sector_breakdown": {
                    "Banking & Financial": 115000,
                    "Software & Services":  80000,
                },
            },
            {
                "name":            "Bajaj Finserv Liquid Fund Reg (G)",
                "asset_class":     "Debt",
                "sub_category":    "Debt:Liquid",
                "cap_breakdown":   {},
                "current_value":   3983,
                "sector_breakdown": {},
            },
            {
                "name":            "ICICI Pru Large Cap Fund Reg (G)",
                "asset_class":     "Equity",
                "sub_category":    "Equity:Large Cap",
                "cap_breakdown":   {"Large": 0.92, "Mid": 0.07, "Small": 0.01},
                "current_value":   1328101,
                "sector_breakdown": {
                    "Banking & Financial": 318000,
                    "Petroleum Products":  135000,
                    "Software & Services": 100000,
                },
            },
            {
                "name":            "ICICI Pru Multi Asset Fund (G)",
                "asset_class":     "Hybrid",
                "sub_category":    "Hybrid:Multi-Asset",
                "cap_breakdown":   {"Large": 0.60, "Mid": 0.25, "Small": 0.15},
                "current_value":   2106965,
                "sector_breakdown": {
                    "Banking & Financial": 420000,
                    "Gold":                 94813,
                    "Petroleum Products":  110000,
                },
            },
            {
                "name":            "Mirae Asset Nifty India Manufacturing ETF FoF Reg (G)",
                "asset_class":     "Equity",
                "sub_category":    "Equity:Thematic",
                "cap_breakdown":   {"Large": 0.78, "Mid": 0.18, "Small": 0.04},
                "current_value":   1117217,
                "sector_breakdown": {
                    "Automobile":          405438,
                    "Construction":        253705,
                    "Pharma & Biotech":    249324,
                },
            },
        ],
    }


def parse_from_dict(raw: dict) -> dict:
    """Build a portfolio dict from a minimal raw dict."""
    return {
        "client":            raw.get("client", {}),
        "reported":          raw.get("reported", {}),
        "all_cashflows":     raw.get("all_cashflows", []),
        "target_allocation": raw.get("target_allocation", {}),
        "nav_series":        raw.get("nav_series", []),
        "monthly_returns":   raw.get("monthly_returns", []),
        "schemes":           raw.get("schemes", []),
        "holdings":          raw.get("holdings", raw.get("schemes", [])),
    }


def parse_client_extended() -> dict:
    """
    Extended client portfolio with NPS, PPF, Direct Equity, Gold ETF, SGB added.
    Demonstrates multi-asset class digital twin.
    """
    base = parse_client()

    # Add extended assets
    base["assets"] = [
        {
            "name":           "NPS Tier I - HDFC Pension (Auto Choice)",
            "asset_class":    "Hybrid",
            "sub_type":       "NPS:E",
            "purchase_value": 350000,
            "current_value":  510000,
            "holding_days":   1825,
            "lock_in_years":  20,
            "liquidity":      "Locked",
            "taxability":     "Exempt",
            "metadata": {
                "tier": "I",
                "pran": "XXXX1234",
                "e_pct": 75, "c_pct": 15, "g_pct": 10,
                "annuity_pct": 40,
            },
        },
        {
            "name":           "PPF - SBI",
            "asset_class":    "Debt",
            "sub_type":       "PPF",
            "purchase_value": 150000,
            "current_value":  198000,
            "holding_days":   1460,
            "annual_yield_pct": 7.1,
            "lock_in_years":  15,
            "liquidity":      "Low",
            "taxability":     "TaxFree",
            "metadata": {"account": "PPFXXX789", "maturity_year": 2032},
        },
        {
            "name":           "Sovereign Gold Bond 2021 Series IV",
            "asset_class":    "Gold",
            "sub_type":       "SGB",
            "purchase_value": 47200,
            "current_value":  68500,
            "holding_days":   1095,
            "annual_yield_pct": 2.5,
            "lock_in_years":  8,
            "liquidity":      "Low",
            "taxability":     "TaxFree",
            "metadata": {"units": 10, "issue_price": 4720, "coupon_pct": 2.5},
        },
        {
            "name":           "HDFC Bank Ltd (Direct Equity)",
            "asset_class":    "Equity",
            "sub_type":       "DirectEquity",
            "purchase_value": 125000,
            "current_value":  138000,
            "holding_days":   540,
            "liquidity":      "High",
            "taxability":     "LTCG",
            "metadata": {"symbol": "HDFCBANK", "qty": 80, "avg_buy": 1562.5},
        },
        {
            "name":           "Embassy Office Parks REIT",
            "asset_class":    "Real Estate",
            "sub_type":       "REIT",
            "purchase_value": 75000,
            "current_value":  82000,
            "holding_days":   400,
            "annual_yield_pct": 6.5,
            "liquidity":      "Medium",
            "taxability":     "LTCG",
            "metadata": {"symbol": "EMBASSY", "qty": 200, "distribution_yield": 6.5},
        },
        {
            "name":           "RBI Floating Rate Bond 2031",
            "asset_class":    "Debt",
            "sub_type":       "RBIBond",
            "purchase_value": 200000,
            "current_value":  200000,
            "holding_days":   365,
            "annual_yield_pct": 8.20,
            "lock_in_years":  7,
            "liquidity":      "Low",
            "taxability":     "Taxable",
            "metadata": {"maturity": "2031", "coupon": "floating_NSC+0.35"},
        },
    ]

    # Update reported totals to include extended assets
    ext_cv  = sum(a["current_value"] for a in base["assets"])
    ext_pv  = sum(a["purchase_value"] for a in base["assets"])
    base["reported"]["current_value_extended"] = base["reported"]["current_value"] + ext_cv
    base["reported"]["invested_extended"]      = base["reported"]["net_investment"] + ext_pv
    base["reported"]["tenure_years"]           = 14.4

    return base


# Backward-compatible aliases
parse_shikha          = parse_client
parse_shikha_extended = parse_client_extended
