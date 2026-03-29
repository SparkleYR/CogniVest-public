# Universal asset model
#
# Defines data structures and return/risk priors for all asset classes:
#   Mutual Funds, NPS, PPF, Direct Equity, Gold ETF/SGB,
#   Corporate Bonds, RBI Bonds/FDs, REITs/InvITs, PMS/SIF
#
# Every asset produces a standard AssetSnapshot used by all agents.

from dataclasses import dataclass, field
from typing import Optional


# ---------------------------------------------------------------------------
# Standard snapshot -- all agents consume this
# ---------------------------------------------------------------------------

@dataclass
class AssetSnapshot:
    name:             str
    asset_class:      str        # Equity, Debt, Gold, Real Estate, Hybrid, Cash
    sub_type:         str        # MF, NPS, PPF, DirectEquity, GoldETF, SGB,
                                 # CorpBond, RBIBond, FD, REIT, InvIT, PMS, SIF
    purchase_value:   float
    current_value:    float
    holding_days:     int
    liquidity:        str        # High, Medium, Low, Locked
    taxability:       str        # LTCG, STCG, Debt, TaxFree, Exempt
    lock_in_years:    float      # 0 if no lock-in
    annual_yield_pct: Optional[float] = None   # for fixed-income assets
    cap_breakdown:    dict       = field(default_factory=dict)
    sector_breakdown: dict       = field(default_factory=dict)
    metadata:         dict       = field(default_factory=dict)

    @property
    def gain(self) -> float:
        return self.current_value - self.purchase_value

    @property
    def abs_return_pct(self) -> float:
        if self.purchase_value <= 0: return 0.0
        return (self.current_value / self.purchase_value - 1) * 100


# ---------------------------------------------------------------------------
# Volatility and return priors per sub_type
# Used by Risk Agent when no historical NAV is available
# ---------------------------------------------------------------------------

ASSET_PRIORS = {
    # sub_type: {annual_vol, expected_return, correlation_group}
    "MF:LargeCap":       {"vol": 0.14, "exp_ret": 0.12, "group": "equity_india"},
    "MF:MidCap":         {"vol": 0.18, "exp_ret": 0.14, "group": "equity_india"},
    "MF:SmallCap":       {"vol": 0.22, "exp_ret": 0.15, "group": "equity_india"},
    "MF:FlexiCap":       {"vol": 0.16, "exp_ret": 0.13, "group": "equity_india"},
    "MF:Thematic":       {"vol": 0.20, "exp_ret": 0.13, "group": "equity_india"},
    "MF:MultiAsset":     {"vol": 0.10, "exp_ret": 0.10, "group": "hybrid"},
    "MF:Liquid":         {"vol": 0.01, "exp_ret": 0.07, "group": "debt"},
    "MF:DebtShort":      {"vol": 0.03, "exp_ret": 0.07, "group": "debt"},
    "MF:GoldETF":        {"vol": 0.15, "exp_ret": 0.08, "group": "gold"},

    # NPS -- blended based on allocation across E/C/G
    "NPS:E":             {"vol": 0.14, "exp_ret": 0.12, "group": "equity_india"},
    "NPS:C":             {"vol": 0.05, "exp_ret": 0.08, "group": "debt"},
    "NPS:G":             {"vol": 0.04, "exp_ret": 0.07, "group": "debt"},

    # PPF -- guaranteed, no volatility
    "PPF":               {"vol": 0.00, "exp_ret": 0.071, "group": "guaranteed"},

    # Direct equity -- treated as mid-cap proxy unless NSE classification available
    "DirectEquity":      {"vol": 0.22, "exp_ret": 0.13, "group": "equity_india"},

    # Gold
    "GoldETF":           {"vol": 0.15, "exp_ret": 0.08, "group": "gold"},
    "SGB":               {"vol": 0.15, "exp_ret": 0.10, "group": "gold"},  # extra 2.5% interest

    # Fixed income
    "CorpBond":          {"vol": 0.05, "exp_ret": 0.08, "group": "debt"},
    "RBIBond":           {"vol": 0.00, "exp_ret": 0.082, "group": "guaranteed"},  # floating ~8.2%
    "FD":                {"vol": 0.00, "exp_ret": 0.070, "group": "guaranteed"},

    # Real estate / infrastructure
    "REIT":              {"vol": 0.12, "exp_ret": 0.09, "group": "real_estate"},
    "InvIT":             {"vol": 0.13, "exp_ret": 0.10, "group": "real_estate"},

    # Alternate / professional management
    "PMS":               {"vol": 0.18, "exp_ret": 0.14, "group": "equity_india"},
    "SIF":               {"vol": 0.16, "exp_ret": 0.13, "group": "equity_india"},
}

# Correlation matrix between groups (used by Risk Agent for portfolio vol)
GROUP_CORRELATIONS = {
    ("equity_india", "equity_india"):   0.70,
    ("equity_india", "hybrid"):         0.60,
    ("equity_india", "debt"):           0.10,
    ("equity_india", "gold"):          -0.05,
    ("equity_india", "real_estate"):    0.40,
    ("equity_india", "guaranteed"):     0.00,
    ("hybrid",       "hybrid"):         0.70,
    ("hybrid",       "debt"):           0.40,
    ("hybrid",       "gold"):           0.10,
    ("hybrid",       "real_estate"):    0.30,
    ("hybrid",       "guaranteed"):     0.00,
    ("debt",         "debt"):           0.60,
    ("debt",         "gold"):           0.05,
    ("debt",         "real_estate"):    0.10,
    ("debt",         "guaranteed"):     0.10,
    ("gold",         "gold"):           0.80,
    ("gold",         "real_estate"):    0.05,
    ("gold",         "guaranteed"):     0.00,
    ("real_estate",  "real_estate"):    0.70,
    ("real_estate",  "guaranteed"):     0.00,
    ("guaranteed",   "guaranteed"):     0.00,
}


def get_correlation(group_a: str, group_b: str) -> float:
    if group_a == group_b:
        return GROUP_CORRELATIONS.get((group_a, group_b), 0.70)
    key = (min(group_a, group_b), max(group_a, group_b))
    return GROUP_CORRELATIONS.get(key, GROUP_CORRELATIONS.get((group_b, group_a), 0.10))


def get_prior(sub_type: str) -> dict:
    return ASSET_PRIORS.get(sub_type, {"vol": 0.15, "exp_ret": 0.10, "group": "equity_india"})


# ---------------------------------------------------------------------------
# Asset class helpers
# ---------------------------------------------------------------------------

ASSET_CLASS_MAP = {
    "MF:LargeCap":    "Equity",
    "MF:MidCap":      "Equity",
    "MF:SmallCap":    "Equity",
    "MF:FlexiCap":    "Equity",
    "MF:Thematic":    "Equity",
    "MF:MultiAsset":  "Hybrid",
    "MF:Liquid":      "Debt",
    "MF:DebtShort":   "Debt",
    "MF:GoldETF":     "Gold",
    "NPS:E":          "Equity",
    "NPS:C":          "Debt",
    "NPS:G":          "Debt",
    "PPF":            "Debt",
    "DirectEquity":   "Equity",
    "GoldETF":        "Gold",
    "SGB":            "Gold",
    "CorpBond":       "Debt",
    "RBIBond":        "Debt",
    "FD":             "Debt",
    "REIT":           "Real Estate",
    "InvIT":          "Real Estate",
    "PMS":            "Equity",
    "SIF":            "Equity",
}

LIQUIDITY_MAP = {
    "MF:Liquid":      "High",
    "MF:DebtShort":   "High",
    "MF:LargeCap":    "High",
    "MF:MidCap":      "High",
    "MF:SmallCap":    "Medium",
    "MF:FlexiCap":    "High",
    "MF:Thematic":    "Medium",
    "MF:MultiAsset":  "High",
    "MF:GoldETF":     "High",
    "NPS:E":          "Locked",
    "NPS:C":          "Locked",
    "NPS:G":          "Locked",
    "PPF":            "Low",
    "DirectEquity":   "High",
    "GoldETF":        "High",
    "SGB":            "Low",
    "CorpBond":       "Medium",
    "RBIBond":        "Low",
    "FD":             "Low",
    "REIT":           "Medium",
    "InvIT":          "Medium",
    "PMS":            "Low",
    "SIF":            "Low",
}

TAXABILITY_MAP = {
    "MF:LargeCap":    "LTCG",
    "MF:MidCap":      "LTCG",
    "MF:SmallCap":    "LTCG",
    "MF:FlexiCap":    "LTCG",
    "MF:Thematic":    "LTCG",
    "MF:MultiAsset":  "LTCG",
    "MF:Liquid":      "Debt",
    "MF:DebtShort":   "Debt",
    "MF:GoldETF":     "Debt",
    "NPS:E":          "Exempt",
    "NPS:C":          "Exempt",
    "NPS:G":          "Exempt",
    "PPF":            "TaxFree",
    "DirectEquity":   "LTCG",
    "GoldETF":        "Debt",
    "SGB":            "TaxFree",
    "CorpBond":       "Debt",
    "RBIBond":        "Taxable",
    "FD":             "Taxable",
    "REIT":           "LTCG",
    "InvIT":          "LTCG",
    "PMS":            "LTCG",
    "SIF":            "LTCG",
}
