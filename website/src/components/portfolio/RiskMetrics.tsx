import React from "react";
import { motion } from "motion/react";
import { ShieldAlert, Activity, TrendingDown } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinPortfolioSnapshot } from "../../utils/cognivest-api";
import { C, formatINR, formatPct } from "../../utils/portfolio-helpers";

interface Props {
  portfolio: TwinPortfolioSnapshot;
}

function VolatilityGauge({ value }: { value: number }) {
  const radius = 38;
  const circumference = Math.PI * radius; // half-circle
  const clampedPct = Math.min(100, (value / 25) * 100); // 25% = max on scale
  const filled = (clampedPct / 100) * circumference;
  const colour = value < 10 ? C.green : value < 18 ? C.amber : C.red;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="56" viewBox="0 0 100 56">
        {/* Track */}
        <path
          d="M 11 50 A 39 39 0 0 1 89 50"
          fill="none"
          stroke={C.border}
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Filled */}
        <path
          d="M 11 50 A 39 39 0 0 1 89 50"
          fill="none"
          stroke={colour}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        {/* Value text */}
        <text
          x="50"
          y="44"
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fontFamily="monospace"
          fill={colour}
        >
          {value.toFixed(1)}%
        </text>
      </svg>
      <div className="text-[10px] text-muted-foreground mt-1">0% — 25%</div>
    </div>
  );
}

export function RiskMetrics({ portfolio: p }: Props) {
  const hhi = p.hhi_concentration;
  const hhiColour = hhi > 0.25 ? C.red : hhi > 0.10 ? C.amber : C.green;
  const hhiLabel =
    hhi > 0.25
      ? "Highly Concentrated"
      : hhi > 0.20
      ? "Moderately Concentrated"
      : hhi > 0.10
      ? "Moderate"
      : "Diversified";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      {/* Volatility */}
      <MagicCard gradientFrom={C.amber} gradientTo={C.red} gradientOpacity={0.1}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="p-5"
        >
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <Activity size={14} style={{ color: C.amber }} />
            Portfolio Volatility
          </div>
          <VolatilityGauge value={p.volatility_pct ?? 0} />
          <div className="mt-3 text-center">
            <div
              className="text-2xl font-bold font-mono"
              style={{
                color:
                  (p.volatility_pct ?? 0) < 10
                    ? C.green
                    : (p.volatility_pct ?? 0) < 18
                    ? C.amber
                    : C.red,
              }}
            >
              {formatPct(p.volatility_pct)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(p.volatility_pct ?? 0) < 10
                ? "Low volatility · conservative range"
                : (p.volatility_pct ?? 0) < 18
                ? "Moderate volatility range"
                : "High volatility · review exposure"}
            </div>
          </div>
        </motion.div>
      </MagicCard>

      {/* Concentration */}
      <MagicCard gradientFrom={C.teal} gradientTo={C.accent} gradientOpacity={0.1}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="p-5"
        >
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <ShieldAlert size={14} style={{ color: C.teal }} />
            Concentration (HHI)
          </div>
          <div className="text-3xl font-bold font-mono" style={{ color: hhiColour }}>
            {hhi?.toFixed(3) ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1 mb-4">{hhiLabel}</div>
          <div className="h-1.5 rounded-full bg-border/40 mb-1">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (hhi / 0.5) * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: hhiColour }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">HHI safe range: 0.10 – 0.20</div>
          <div className="mt-3 space-y-1.5 text-xs">
            {p.hhi_concentration != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top holding weight</span>
                <span className="font-mono font-bold" style={{ color: C.amber }}>
                  {/* weight from holdings */}
                  {p.holdings?.[0]?.weight_pct != null
                    ? formatPct(Math.max(...(p.holdings?.map((h) => h.weight_pct) ?? [0])))
                    : "—"}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </MagicCard>

      {/* Downside Risk */}
      <MagicCard gradientFrom={C.red} gradientTo={C.amber} gradientOpacity={0.1}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="p-5"
        >
          <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
            <TrendingDown size={14} style={{ color: C.red }} />
            Downside Risk
          </div>
          {/* Shock loss */}
          <div
            className="px-4 py-3 rounded-xl mb-3"
            style={{ background: C.red + "15", border: `1px solid ${C.red}30` }}
          >
            <div className="text-[10px] text-muted-foreground mb-1">20% market crash scenario</div>
            <div className="text-lg font-bold font-mono" style={{ color: C.red }}>
              {formatINR(p.shock_loss_20pct_inr)} loss
            </div>
          </div>
          {/* VaR */}
          <div
            className="px-4 py-3 rounded-xl"
            style={{ background: C.amber + "12", border: `1px solid ${C.amber}30` }}
          >
            <div className="text-[10px] text-muted-foreground mb-1">VaR 95% · 1 day</div>
            <div className="text-lg font-bold font-mono" style={{ color: C.amber }}>
              {formatPct(p.var_95_1day_pct)}
            </div>
          </div>
        </motion.div>
      </MagicCard>
    </div>
  );
}
