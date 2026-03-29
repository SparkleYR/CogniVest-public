import React from "react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { TrendingDown, Zap } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinBehaviourProfile } from "../../utils/cognivest-api";
import { MonteCarloFanChart } from "../MonteCarloFanChart";
import { C, formatINR, formatINRShort, formatPct } from "../../utils/portfolio-helpers";

interface Props {
  sim: TwinBehaviourProfile["simulation"];
  cost: number;
}

function SimBar({
  label,
  value,
  max,
  colour,
  displayValue,
  delay,
}: {
  label: string;
  value: number;
  max: number;
  colour: string;
  displayValue: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-3 mb-2.5"
    >
      <span className="text-[10px] text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-border/50 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
          transition={{ delay: delay + 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: colour }}
        />
      </div>
      <span className="text-[11px] font-bold font-mono w-20 text-right" style={{ color: colour }}>
        {displayValue}
      </span>
    </motion.div>
  );
}

export function BehaviourSimulation({ sim, cost }: Props) {
  if (!sim) return null;

  const chartData = [
    {
      label: "P10",
      rational: Math.round(sim.p10_outcome * 1.15),
      behavioural: Math.round(sim.p10_outcome),
    },
    {
      label: "Median",
      rational: Math.round(sim.rational_median_10yr),
      behavioural: Math.round(sim.behavioural_median_10yr),
    },
    {
      label: "P90",
      rational: Math.round(sim.p90_outcome * 1.15),
      behavioural: Math.round(sim.p90_outcome),
    },
  ];

  const maxVal = Math.max(sim.rational_median_10yr, sim.p90_outcome * 1.15) * 1.1;

  return (
    <MagicCard gradientFrom={C.red} gradientTo={C.amber} gradientOpacity={0.07} className="mb-4">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
        <Zap size={14} style={{ color: C.amber }} />
        10-Year Wealth Simulation
      </div>
      <div className="p-4">

        {/* Rational vs Behavioural median cards */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: C.green + "15", border: `1px solid ${C.green}25` }}
          >
            <div className="text-[10px] text-muted-foreground mb-1">If fully rational</div>
            <div className="text-xl font-bold font-mono" style={{ color: C.green }}>
              {formatINRShort(sim.rational_median_10yr)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">median 10yr</div>
          </div>
          <div
            className="rounded-xl p-3 text-center"
            style={{ background: C.amber + "15", border: `1px solid ${C.amber}25` }}
          >
            <div className="text-[10px] text-muted-foreground mb-1">With current biases</div>
            <div className="text-xl font-bold font-mono" style={{ color: C.amber }}>
              {formatINRShort(sim.behavioural_median_10yr)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">median 10yr</div>
          </div>
        </div>

        {/* Wealth gap callout */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-4"
          style={{ background: C.red + "18", border: `1px solid ${C.red}30` }}
        >
          <div className="flex items-center gap-2">
            <TrendingDown size={13} style={{ color: C.red }} />
            <span className="text-xs text-muted-foreground">Behaviour cost (10yr)</span>
          </div>
          <span className="font-mono font-bold text-sm" style={{ color: C.red }}>
            −{formatINR(cost ?? sim.wealth_gap_inr)}
          </span>
        </motion.div>

        {/* Metric bars */}
        <SimBar
          label="Panic rate"
          value={sim.panic_rate_pct}
          max={100}
          colour={sim.panic_rate_pct > 40 ? C.red : sim.panic_rate_pct > 20 ? C.amber : C.green}
          displayValue={formatPct(sim.panic_rate_pct)}
          delay={0.1}
        />
        <SimBar
          label="P10 outcome"
          value={sim.p10_outcome}
          max={maxVal}
          colour={C.teal}
          displayValue={formatINRShort(sim.p10_outcome)}
          delay={0.15}
        />
        <SimBar
          label="P90 outcome"
          value={sim.p90_outcome}
          max={maxVal}
          colour={C.accent}
          displayValue={formatINRShort(sim.p90_outcome)}
          delay={0.2}
        />

        {/* Bar chart: rational vs behavioural at p10/median/p90 */}
        <div className="h-36 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.text2 }} tickLine={false} axisLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatINRShort(value),
                  name === "rational" ? "Rational" : "Behavioural",
                ]}
                contentStyle={{
                  background: "#1c1c25",
                  border: "1px solid #2a2a35",
                  borderRadius: "10px",
                  fontSize: "11px",
                }}
              />
              <Bar dataKey="rational" name="rational" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={C.green + "cc"} />
                ))}
              </Bar>
              <Bar dataKey="behavioural" name="behavioural" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={C.amber + "cc"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 justify-center mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: C.green + "cc" }} />
            <span className="text-[10px] text-muted-foreground">Rational</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: C.amber + "cc" }} />
            <span className="text-[10px] text-muted-foreground">Behavioural</span>
          </div>
        </div>

        {sim.percentile_series && (
          <div className="mt-5">
            <div className="text-[10px] mb-2 font-medium uppercase tracking-wide" style={{ color: C.text2 }}>
              Wealth path distribution (P10–P90)
            </div>
            <MonteCarloFanChart percentileSeries={sim.percentile_series} />
          </div>
        )}
      </div>
    </MagicCard>
  );
}
