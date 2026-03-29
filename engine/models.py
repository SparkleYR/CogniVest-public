from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class MetaData(BaseModel):
    client_id: str
    session_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    twin_version: str = "1.0"
    twin_confidence: float = 0.5
    source: str
    consent_given: bool = True
    consent_timestamp: Optional[str] = None

class PersonalDetails(BaseModel):
    name: str
    age: int
    city: str
    occupation: str
    income_range: str
    monthly_income: float
    monthly_expenses: float
    monthly_surplus: float
    family_size: int
    dependents: int
    marital_status: str
    existing_emi: float = 0
    total_debt: float = 0
    tax_bracket_pct: Optional[int] = None

class Goal(BaseModel):
    goal_id: str
    goal_type: str
    goal_label: str
    target_amount: float
    horizon_years: float
    current_corpus: float = 0
    monthly_sip: float = 0
    priority: int
    flexibility: str
    confidence: Optional[float] = None

class RiskProfile(BaseModel):
    stated_risk_score: int
    revealed_risk_score: float
    blended_risk_score: float
    risk_label: str
    max_loss_tolerance_pct: float
    volatility_comfort: str
    loss_sleep_test: Optional[str] = None
    preferred_return: Optional[float] = None
    return_realistic: Optional[bool] = None

class Liquidity(BaseModel):
    liquidity_need: str
    emergency_fund_months: int
    emergency_access_pct: Optional[float] = None
    lock_in_comfort_years: float
    income_stability: str
    job_security_score: Optional[int] = None

class TaxProfile(BaseModel):
    tax_bracket_pct: int
    tax_saving_priority: bool
    sec_80c_exhausted: bool
    sec_80d_exhausted: Optional[bool] = None
    nps_interest: bool
    ltcg_awareness: bool
    tax_harvesting_interest: Optional[bool] = None
    residential_status: str
    new_vs_old_regime: Optional[str] = None
    deductions_80_series: Optional[Dict[str, Any]] = None
    salary_deductions: Optional[Dict[str, Any]] = None
    capital_gains: Optional[Dict[str, Any]] = None

class Asset(BaseModel):
    asset_id: str
    name: str
    asset_class: str
    sub_type: str
    scheme_code: Optional[str] = None
    purchase_value: float
    current_value: float
    purchase_date: Optional[str] = None
    holding_days: Optional[int] = None
    annual_yield_pct: Optional[float] = None
    lock_in_years: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class ExistingPortfolio(BaseModel):
    total_invested: float
    total_current_value: float
    assets: List[Asset] = []

class BehaviourProfile(BaseModel):
    loss_aversion: float
    panic_threshold_pct: float
    recency_bias: float
    overconfidence: float
    anchoring_strength: Optional[float] = None
    herding_tendency: Optional[float] = None
    patience_score: float
    check_frequency: str
    sold_in_panic: bool
    past_crash_reaction: Optional[str] = None
    years_investing: Optional[int] = None
    past_instruments: Optional[List[str]] = None
    biggest_loss_taken_pct: Optional[float] = None
    anxiety_triggers: Optional[List[str]] = None
    positive_signals: Optional[List[str]] = None
    key_quotes: List[str] = []
    risk_label: str
    panic_multiplier: Optional[float] = None
    source: str
    confidence: float

class Insurance(BaseModel):
    term_life: Optional[Dict[str, Any]] = None
    health_insurance: Optional[Dict[str, Any]] = None
    other_insurance: Optional[Dict[str, Any]] = None

class ForeignAssets(BaseModel):
    has_foreign_assets: bool
    foreign_investments: Optional[List[Dict[str, Any]]] = None
    lrs_compliance: Optional[Dict[str, Any]] = None

class Liabilities(BaseModel):
    home_loan: Optional[Dict[str, Any]] = None
    credit_card_debt: Optional[Dict[str, Any]] = None

class SuccessionPlanning(BaseModel):
    has_will: bool
    nominees_updated: bool

class InvestmentPreferences(BaseModel):
    preferred_asset_classes: List[str]
    excluded_sectors: Optional[List[str]] = None
    esg_preference: bool
    direct_vs_regular: str
    active_vs_passive: Optional[str] = None
    sip_preference: bool
    rebalancing_frequency: str
    min_investment_amount: Optional[float] = None
    max_single_fund_pct: Optional[float] = None

class CommunicationPreferences(BaseModel):
    language: str
    communication_style: Optional[str] = None
    meeting_frequency: str
    preferred_channel: str
    best_time_to_call: Optional[str] = None
    advisor_style: str

class ProblemStatement(BaseModel):
    primary_concern: str
    current_dissatisfaction: Optional[str] = None
    what_they_want_fixed: str
    past_advisor_issues: Optional[str] = None
    heard_about_us_from: Optional[str] = None

class RawProfile(BaseModel):
    meta: MetaData
    personal: PersonalDetails
    goals: List[Goal]
    risk_profile: RiskProfile
    liquidity: Liquidity
    tax_profile: TaxProfile
    existing_portfolio: ExistingPortfolio
    behaviour_profile: BehaviourProfile
    insurance: Optional[Insurance] = None
    foreign_assets: Optional[ForeignAssets] = None
    liabilities: Optional[Liabilities] = None
    succession_planning: Optional[SuccessionPlanning] = None
    investment_preferences: InvestmentPreferences
    communication_preferences: CommunicationPreferences
    problem_statement: ProblemStatement

class AskTwinRequest(BaseModel):
    question: str

class ClientSignupRequest(BaseModel):
    """Matches user_data_account_creation.json — chatbot prefills these fields."""
    name: str
    email: str
    password: str
    age: Optional[str] = None
    income_net_worth: Optional[str] = None
    investment_goals: Optional[str] = None
    risk_tolerance: Optional[str] = None

class AdvisorSignupRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    city: Optional[str] = None
    ria_number: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str
