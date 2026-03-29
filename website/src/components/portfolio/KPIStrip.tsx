import React from "react";
import { TrendingUp, TrendingDown, Target, AlertTriangle, Banknote } from "lucide-react";
import type { TwinPortfolioSnapshot, TwinGoalSummary } from "../../utils/cognivest-api";
import { C, formatINR, formatPct, scoreColour } from "../../utils/portfolio-helpers";
import { KPICard } from "./KPICard";

interface Props {
  portfolio: TwinPortfolioSnapshot;
  goalSummary: TwinGoalSummary;
}

export function KPIStrip({ portfolio: p, goalSummary: g }: Props) {
  const gainPositive = (p.total_gain ?? 0) >= 0;
  const xirrPositive = (p.xirr_pct ?? 0) >= 0;
  const goalScore = g?.overall_score ?? null;
  const sipGap = g?.total_sip_gap ?? 0;
  const hasSipGap = sipGap > 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      <KPICard
        label="Current Value"
        value={formatINR(p.total_current_value)}
        sub={`Invested ${formatINR(p.total_invested)}`}
        barColour={C.green}
        icon={<Banknote size={15} />}
      />
      <KPICard
        label="Total Gain"
        value={formatINR(p.total_gain)}
        delta={`${formatPct(p.abs_return_pct)} absolute`}
        deltaPositive={gainPositive}
        barColour={gainPositive ? C.green : C.red}
        icon={gainPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
      />
      <KPICard
        label="XIRR"
        value={formatPct(p.xirr_pct)}
        delta={
          p.nifty_alpha_pp != null
            ? `${p.nifty_alpha_pp > 0 ? "+" : ""}${p.nifty_alpha_pp.toFixed(2)}pp vs Nifty`
            : undefined
        }
        deltaPositive={xirrPositive}
        barColour={C.amber}
        icon={<TrendingUp size={15} />}
      />
      <KPICard
        label="Goal Score"
        value={goalScore != null ? `${goalScore}/100` : "—"}
        sub={g?.overall_verdict ?? undefined}
        barColour={goalScore != null ? scoreColour(goalScore) : C.text2}
        icon={<Target size={15} />}
      />
      <KPICard
        label="SIP Gap"
        value={hasSipGap ? formatINR(sipGap) : "On track"}
        sub={hasSipGap ? "needed per month" : "All goals funded"}
        barColour={hasSipGap ? C.red : C.green}
        icon={<AlertTriangle size={15} />}
      />
    </div>
  );
}
