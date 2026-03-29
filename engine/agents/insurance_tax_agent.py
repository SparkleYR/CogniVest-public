# Insurance & Tax Adequacy Agent
#
# Computes:
#   - Term cover gap (10x annual income rule)
#   - Health cover adequacy
#   - Full tax optimisation across all sections
#   - New vs old regime recommendation
#   - Foreign asset compliance flags

class InsuranceTaxAgent:

    def run(self, portfolio: dict) -> dict:
        personal   = portfolio.get("personal") or {}
        insurance  = portfolio.get("insurance") or {}
        tax        = portfolio.get("complete_tax_profile") or portfolio.get("tax_profile") or {}
        foreign    = portfolio.get("foreign_assets") or {}
        liabilities= portfolio.get("liabilities") or {}

        return {
            "insurance": self._insurance_analysis(personal, insurance),
            "tax":       self._tax_analysis(personal, tax, portfolio),
            "foreign":   self._foreign_analysis(foreign),
            "liabilities": self._liability_analysis(personal, liabilities),
            "succession":  self._succession_flags(portfolio),
        }

    # ── Insurance ──────────────────────────────────────────────────────────

    def _insurance_analysis(self, personal: dict, insurance: dict) -> dict:
        annual_income  = personal.get("monthly_income", 0) * 12
        term           = insurance.get("term_life") or {}
        health         = insurance.get("health_insurance") or {}

        # Term cover analysis — 10x rule
        recommended_term = annual_income * 10
        current_term     = term.get("sum_assured", 0)
        term_gap         = max(0, recommended_term - current_term)

        # Human Life Value method (alternative)
        age              = personal.get("age", 35)
        years_to_retire  = max(0, 60 - age)
        hlv              = annual_income * years_to_retire * 0.6  # 60% of future income

        # Health cover analysis
        family_size      = personal.get("family_size", 2)
        recommended_health = 1000000 if family_size <= 2 else 1500000 if family_size <= 4 else 2000000
        total_health     = health.get("cover_amount", 0)  # flat format
        for p in health.get("policies", []):               # list format
            total_health += p.get("cover_amount", 0)
        employer_cover   = health.get("employer_group_cover", 0)
        health_gap       = max(0, recommended_health - total_health)

        # ULIP/endowment flag
        other            = insurance.get("other_insurance") or {}
        has_bad_products = other.get("has_ulip", False) or other.get("has_endowment", False)

        # Score 0-10
        score = 10
        if term_gap > 0:             score -= 4
        if not term.get("has_term_plan"): score -= 2
        if health_gap > 0:           score -= 2
        if not health.get("has_health_insurance"): score -= 2
        score = max(0, score)

        flags = []
        actions = []
        if not term.get("has_term_plan"):
            flags.append({
                "type": "no_term_plan", "severity": "critical",
                "message": f"No term insurance. Recommended: ₹{recommended_term:,.0f} (10x annual income)"
            })
            actions.append({
                "action": "buy_term_plan",
                "message": f"Buy term plan of ₹{recommended_term:,.0f} for ₹{int(recommended_term * 0.0004):,}/year approx",
                "urgency": "immediate"
            })
        elif term_gap > 0:
            flags.append({
                "type": "term_underinsured", "severity": "warning",
                "message": f"Under-insured by ₹{term_gap:,.0f}. Current: ₹{current_term:,.0f}, Needed: ₹{recommended_term:,.0f}"
            })
            actions.append({
                "action": "increase_term_cover",
                "message": f"Top up term cover by ₹{term_gap:,.0f}",
                "urgency": "high"
            })

        if not health.get("has_health_insurance"):
            flags.append({
                "type": "no_health_insurance", "severity": "critical",
                "message": "No health insurance. One hospitalisation can wipe out years of savings."
            })
            actions.append({
                "action": "buy_health_insurance",
                "message": f"Buy family floater of ₹{recommended_health:,.0f} minimum",
                "urgency": "immediate"
            })
        elif health_gap > 0:
            flags.append({
                "type": "health_underinsured", "severity": "warning",
                "message": f"Health cover gap of ₹{health_gap:,.0f}. Consider super top-up plan."
            })

        if employer_cover > 0 and total_health == 0:
            flags.append({
                "type": "employer_cover_only", "severity": "warning",
                "message": "Only employer group cover — this stops if you change jobs. Buy personal policy."
            })

        if has_bad_products:
            flags.append({
                "type": "ulip_or_endowment", "severity": "info",
                "message": "ULIP or endowment plan detected. Advisor should review — these often have poor returns vs pure term + MF combination."
            })

        return {
            "term": {
                "recommended_cover":  round(recommended_term),
                "current_cover":      round(current_term),
                "coverage_gap":       round(term_gap),
                "human_life_value":   round(hlv),
                "adequately_covered": term_gap == 0 and current_term > 0,
            },
            "health": {
                "recommended_cover":  round(recommended_health),
                "current_cover":      round(total_health),
                "employer_cover":     round(employer_cover),
                "coverage_gap":       round(health_gap),
                "adequately_covered": health_gap == 0 and total_health > 0,
            },
            "adequacy_score":       score,
            "flags":                flags,
            "action_items":         actions,
        }

    # ── Tax ────────────────────────────────────────────────────────────────

    def _tax_analysis(self, personal: dict, tax: dict, portfolio: dict) -> dict:
        monthly_income = personal.get("monthly_income", 0)
        annual_income  = monthly_income * 12
        tax_bracket    = personal.get("tax_bracket_pct")
        if not tax_bracket:
            tax_bracket = tax.get("tax_bracket_pct", 30)

        deductions    = tax.get("deductions_80_series", {})
        other_income  = tax.get("other_income", {})
        cap_gains     = tax.get("capital_gains", {})
        salary_ded    = tax.get("salary_deductions", {})

        # Compute all deductions
        sec_80c       = min(150000, deductions.get("80C", {}).get("current_utilisation", 0))
        sec_80c_gap   = max(0, 150000 - sec_80c)
        sec_80ccd1b   = min(50000, deductions.get("80CCD_1B", 0))
        sec_80d       = min(75000, deductions.get("80D", {}).get("total_80D_deduction", 0))
        sec_80e       = deductions.get("80E", 0)
        sec_80g       = deductions.get("80G", 0)
        sec_80tta     = min(10000, deductions.get("80TTA", 0))

        home_interest = salary_ded.get("home_loan_interest_24b", 0)
        hra_exempt    = salary_ded.get("hra_exempt", 0)
        std_deduction = 50000  # standard deduction for salaried

        # Old regime taxable income
        total_deductions_old = (
            std_deduction + sec_80c + sec_80ccd1b + sec_80d +
            sec_80e + sec_80g + sec_80tta + min(200000, home_interest) + hra_exempt
        )
        taxable_old = max(0, annual_income - total_deductions_old)

        # New regime taxable income (standard deduction only, no 80C etc)
        taxable_new = max(0, annual_income - 75000)  # 75k standard deduction in new regime

        # Compute tax (simplified — FY 2024-25)
        tax_old = self._compute_tax_old(taxable_old)
        tax_new = self._compute_tax_new(taxable_new)

        # LTCG optimisation
        ltcg_used     = cap_gains.get("ltcg_exemption_used", 0)
        ltcg_remaining = max(0, 125000 - ltcg_used)
        ltcg_this_year = cap_gains.get("equity_ltcg_this_fy", 0)
        harvesting_opp = ltcg_remaining > 0 and ltcg_this_year < 125000

        # NPS opportunity
        nps_used       = deductions.get("80CCD_1B", 0)
        nps_gap        = max(0, 50000 - nps_used)
        nps_tax_saving = nps_gap * (tax_bracket / 100)

        optimal_regime = "new" if tax_new < tax_old else "old"
        regime_saving  = abs(tax_old - tax_new)

        actions = []
        if sec_80c_gap > 0:
            saving = sec_80c_gap * (tax_bracket / 100)
            actions.append({
                "action": "maximise_80c",
                "message": f"₹{sec_80c_gap:,.0f} of 80C limit unused. Invest in ELSS/PPF to save ₹{saving:,.0f} in tax.",
                "saving_inr": round(saving),
                "urgency": "high"
            })
        if nps_gap > 0:
            actions.append({
                "action": "invest_nps_80ccd1b",
                "message": f"Invest ₹{nps_gap:,.0f} in NPS for additional 80CCD(1B) deduction — saves ₹{nps_tax_saving:,.0f}.",
                "saving_inr": round(nps_tax_saving),
                "urgency": "high"
            })
        if regime_saving > 5000:
            actions.append({
                "action": f"switch_to_{optimal_regime}_regime",
                "message": f"Switch to {optimal_regime} regime to save ₹{regime_saving:,.0f} in tax this year.",
                "saving_inr": round(regime_saving),
                "urgency": "immediate"
            })
        if harvesting_opp:
            actions.append({
                "action": "tax_loss_harvest",
                "message": f"₹{ltcg_remaining:,.0f} of LTCG exemption unused. Book profits before March 31 to use it.",
                "saving_inr": round(ltcg_remaining * 0.125),
                "urgency": "before_march31"
            })

        return {
            "current_regime":        tax.get("regime", {}).get("current_regime", "unknown"),
            "optimal_regime":        optimal_regime,
            "tax_old_regime":        round(tax_old),
            "tax_new_regime":        round(tax_new),
            "regime_saving_inr":     round(regime_saving),
            "total_deductions_old":  round(total_deductions_old),
            "taxable_income_old":    round(taxable_old),
            "taxable_income_new":    round(taxable_new),
            "sec_80c_utilised":      round(sec_80c),
            "sec_80c_gap":           round(sec_80c_gap),
            "sec_80ccd1b_utilised":  round(sec_80ccd1b),
            "sec_80ccd1b_gap":       round(nps_gap),
            "sec_80d_utilised":      round(sec_80d),
            "ltcg_exemption_remaining": round(ltcg_remaining),
            "total_potential_tax_saving": round(sum(a.get("saving_inr",0) for a in actions)),
            "action_items":          actions,
        }

    def _compute_tax_old(self, taxable: float) -> float:
        """Old regime tax slabs FY 2024-25"""
        tax = 0.0
        slabs = [(250000, 0), (250000, 0.05), (250000, 0.10),
                 (250000, 0.15), (250000, 0.20), (float('inf'), 0.30)]
        remaining = taxable
        for slab, rate in slabs:
            if remaining <= 0: break
            taxed = min(remaining, slab)
            tax  += taxed * rate
            remaining -= taxed
        return tax * 1.04  # 4% cess

    def _compute_tax_new(self, taxable: float) -> float:
        """New regime tax slabs FY 2024-25"""
        tax = 0.0
        if taxable <= 300000: return 0
        slabs = [(300000, 0), (300000, 0.05), (300000, 0.10),
                 (300000, 0.15), (300000, 0.20), (float('inf'), 0.30)]
        remaining = taxable
        for slab, rate in slabs:
            if remaining <= 0: break
            taxed = min(remaining, slab)
            tax  += taxed * rate
            remaining -= taxed
        return tax * 1.04

    # ── Foreign assets ─────────────────────────────────────────────────────

    def _foreign_analysis(self, foreign: dict) -> dict:
        if not foreign.get("has_foreign_assets"):
            return {"has_foreign_assets": False}

        investments    = foreign.get("foreign_investments", [])
        total_inr      = sum(i.get("value_inr_equivalent", 0) for i in investments)
        lrs_used       = foreign.get("lrs_compliance", {}).get("lrs_used_this_fy", 0)
        lrs_remaining  = max(0, 250000 - lrs_used)

        flags = []
        if foreign.get("residential_status_fema") == "resident" and total_inr > 0:
            flags.append({
                "type": "schedule_fa_required",
                "message": "Foreign assets must be disclosed in Schedule FA of ITR. Non-disclosure has severe penalties under Black Money Act."
            })
        if lrs_used > 700000 / 83:  # approx 7L INR in USD
            flags.append({
                "type": "tcs_applicable",
                "message": f"TCS of 20% applicable on LRS above Rs.7L equivalent. Verify TCS has been collected."
            })

        return {
            "has_foreign_assets":     True,
            "total_foreign_inr":      round(total_inr),
            "lrs_used_usd":           lrs_used,
            "lrs_remaining_usd":      round(lrs_remaining),
            "schedule_fa_required":   True,
            "flags":                  flags,
        }

    # ── Liabilities ────────────────────────────────────────────────────────

    def _liability_analysis(self, personal: dict, liabilities: dict) -> dict:
        monthly_income = personal.get("monthly_income", 1)
        home  = liabilities.get("home_loan") or {}
        car   = liabilities.get("car_loan") or {}
        pl    = liabilities.get("personal_loan") or {}
        cc    = liabilities.get("credit_card_debt") or {}
        edu   = liabilities.get("education_loan") or {}

        total_debt = sum([
            home.get("outstanding", 0), car.get("outstanding", 0),
            pl.get("outstanding", 0), cc.get("outstanding", 0),
            edu.get("outstanding", 0)
        ])
        total_emi  = sum([
            home.get("emi", 0), car.get("emi", 0),
            pl.get("emi", 0), edu.get("emi", 0)
        ])
        foir = total_emi / monthly_income if monthly_income > 0 else 0

        flags = []
        if cc.get("outstanding", 0) > 0:
            flags.append({
                "type": "credit_card_debt", "severity": "critical",
                "message": f"Credit card debt of ₹{cc.get('outstanding',0):,.0f} at ~36% interest. Pay this off before any investment."
            })
        if pl.get("outstanding", 0) > 0 and pl.get("rate", 0) > 15:
            flags.append({
                "type": "high_cost_personal_loan", "severity": "warning",
                "message": f"Personal loan at high interest rate. Consider prepaying before investing."
            })
        if foir > 0.5:
            flags.append({
                "type": "high_foir", "severity": "warning",
                "message": f"FOIR (Fixed Obligation to Income Ratio) is {foir:.0%} — above 50% is risky. Loan eligibility may be impacted."
            })

        return {
            "total_debt":       round(total_debt),
            "total_monthly_emi":round(total_emi),
            "foir_pct":         round(foir * 100, 1),
            "foir_healthy":     foir <= 0.4,
            "flags":            flags,
        }

    # ── Succession ─────────────────────────────────────────────────────────

    def _succession_flags(self, portfolio: dict) -> dict:
        succession  = portfolio.get("succession_planning", {})
        personal    = portfolio.get("personal", {})
        has_will    = succession.get("has_will", False)
        nominees_ok = succession.get("nominees_updated", False)
        has_kids    = personal.get("dependents", 0) > 0

        flags = []
        if not has_will and has_kids:
            flags.append({
                "type": "no_will", "severity": "critical",
                "message": "No will with dependents. Assets may go to court if something happens. Create a will immediately."
            })
        if not nominees_ok:
            flags.append({
                "type": "nominees_not_updated", "severity": "warning",
                "message": "Nominees not confirmed as updated across all accounts. This is a 1-hour task that prevents years of legal hassle."
            })

        return {
            "has_will":           has_will,
            "nominees_updated":   nominees_ok,
            "action_required":    len(flags) > 0,
            "flags":              flags,
        }
