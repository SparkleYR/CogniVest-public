import React from "react";

interface OnboardingReviewPanelProps {
  rawProfile: Record<string, unknown>;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 border-b border-border/40 pb-1">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between items-baseline py-1 text-sm gap-4">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-foreground font-medium text-right">{String(value)}</span>
    </div>
  );
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)      return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

export const OnboardingReviewPanel: React.FC<OnboardingReviewPanelProps> = ({
  rawProfile,
  onConfirm,
  onBack,
  isSubmitting,
  error,
}) => {
  const personal  = (rawProfile.personal  ?? {}) as Record<string, unknown>;
  const goals     = (rawProfile.goals     ?? []) as Record<string, unknown>[];
  const risk      = (rawProfile.risk_profile ?? {}) as Record<string, unknown>;
  const portfolio = (rawProfile.existing_portfolio ?? {}) as Record<string, unknown>;
  const assets    = (portfolio.assets ?? []) as unknown[];
  const insurance = (rawProfile.insurance ?? {}) as Record<string, unknown>;
  const termLife  = (insurance.term_life ?? {}) as Record<string, unknown>;
  const health    = (insurance.health_insurance ?? {}) as Record<string, unknown>;
  const tax       = (rawProfile.tax_profile ?? {}) as Record<string, unknown>;
  const problem   = (rawProfile.problem_statement ?? {}) as Record<string, unknown>;

  return (
    <div className="rounded-2xl border border-border bg-background/95 dark:bg-black/80 backdrop-blur-2xl shadow-2xl overflow-hidden w-full max-w-2xl">

      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex items-start gap-3">
        <img
          src="/cognivest-logo-monochrome.svg"
          alt="CogniVest"
          className="h-5 w-5 dark:invert mt-0.5 flex-shrink-0"
        />
        <div>
          <div className="text-sm font-semibold text-foreground/90 tracking-wide">
            Review Your Profile
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Please confirm the details we've collected before building your digital twin.
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="max-h-[55vh] overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-white/10">

        {/* Personal */}
        <Section title="Personal Details">
          <Row label="Name"        value={personal.name as string} />
          <Row label="Age"         value={personal.age as number} />
          <Row label="City"        value={personal.city as string} />
          <Row label="Occupation"  value={(personal.occupation as string)?.replace(/_/g, " ")} />
          <Row label="Monthly Income"   value={fmt(personal.monthly_income as number)} />
          <Row label="Monthly Surplus"  value={fmt(personal.monthly_surplus as number)} />
          <Row label="Family Size"      value={personal.family_size as number} />
          <Row label="Dependents"       value={personal.dependents as number} />
        </Section>

        {/* Goals */}
        {goals.length > 0 && (
          <Section title="Financial Goals">
            {goals.map((g, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap py-1">
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 capitalize">
                  {String(g.goal_type ?? "goal").replace(/_/g, " ")}
                </span>
                {g.target_amount != null && (
                  <span className="text-xs text-muted-foreground">
                    {fmt(g.target_amount as number)}
                  </span>
                )}
                {g.horizon_years != null && (
                  <span className="text-xs text-muted-foreground">
                    · {String(g.horizon_years)} yrs
                  </span>
                )}
                {g.monthly_sip != null && (
                  <span className="text-xs text-muted-foreground">
                    · SIP {fmt(g.monthly_sip as number)}/mo
                  </span>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* Risk Profile */}
        <Section title="Risk Profile">
          <Row label="Self-Rated Risk (1–10)"  value={risk.stated_risk_score as number} />
          <Row label="Max Loss Tolerance"      value={risk.max_loss_tolerance_pct != null ? `${risk.max_loss_tolerance_pct}%` : null} />
          <Row label="Past Crash Reaction"     value={(risk.past_crash_reaction as string)?.replace(/_/g, " ")} />
          <Row label="Portfolio Check Freq."   value={(risk.check_frequency as string)?.replace(/_/g, " ")} />
          <Row label="Years Investing"         value={risk.years_investing as number} />
        </Section>

        {/* Existing Portfolio */}
        <Section title="Existing Portfolio">
          {assets.length > 0 ? (
            <Row
              label="Holdings"
              value={`${assets.length} asset${assets.length !== 1 ? "s" : ""} declared`}
            />
          ) : (
            <p className="text-xs text-muted-foreground py-1">None declared</p>
          )}
        </Section>

        {/* Tax & Insurance */}
        <Section title="Tax & Insurance">
          <Row label="Tax Bracket"    value={tax.tax_bracket_pct != null ? `${tax.tax_bracket_pct}%` : null} />
          <Row label="Tax Regime"     value={(tax.new_vs_old_regime as string)?.replace(/_/g, " ")} />
          <Row label="Term Life"      value={termLife.has_term_plan ? "Yes" : "No"} />
          <Row label="Health Insurance" value={health.has_health_insurance ? "Yes" : "No"} />
        </Section>

        {/* Problem Statement */}
        {problem.primary_concern && (
          <Section title="Primary Concern">
            <p className="text-sm text-foreground/80 leading-relaxed py-1">
              {String(problem.primary_concern)}
            </p>
          </Section>
        )}

      </div>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-border space-y-3">
        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}
        <button
          onClick={onConfirm}
          disabled={isSubmitting}
          className="w-full px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Building your digital twin..." : "Confirm & Build My Portfolio →"}
        </button>
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
        >
          ← Go back and edit
        </button>
      </div>

    </div>
  );
};

export default OnboardingReviewPanel;
