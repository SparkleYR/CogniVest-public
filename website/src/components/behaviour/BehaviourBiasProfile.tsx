import React from "react";
import { motion } from "motion/react";
import { Brain } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinBehaviourProfile } from "../../utils/cognivest-api";
import { C, formatPct } from "../../utils/portfolio-helpers";

interface Props {
  profile: TwinBehaviourProfile;
}

function biasColour(value: number, low: number, high: number, invertGood = false): string {
  // invertGood=false: low is good (e.g. recency_bias)
  // invertGood=true: high is good (e.g. patience_score)
  const ratio = (value - low) / (high - low);
  const risk = invertGood ? 1 - ratio : ratio;
  if (risk >= 0.65) return C.red;
  if (risk >= 0.35) return C.amber;
  return C.green;
}

function BiasRow({
  label,
  value,
  displayValue,
  barFraction,
  colour,
  context,
  delay,
}: {
  label: string;
  value: number;
  displayValue: string;
  barFraction: number;
  colour: string;
  context?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="mb-4"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground w-36 flex-shrink-0">{label}</span>
        <div className="flex-1 mx-3 h-1.5 rounded-full bg-border/50 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, barFraction * 100))}%` }}
            transition={{ delay: delay + 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            style={{ background: colour }}
          />
        </div>
        <span
          className="text-xs font-bold font-mono w-16 text-right"
          style={{ color: colour }}
        >
          {displayValue}
        </span>
      </div>
      {context && (
        <div className="text-[10px] text-muted-foreground/60 ml-36 pl-3">{context}</div>
      )}
    </motion.div>
  );
}

export function BehaviourBiasProfile({ profile: p }: Props) {
  const biases = [
    {
      label: "Loss Aversion",
      displayValue: `${p.loss_aversion?.toFixed(1) ?? "—"}×`,
      barFraction: Math.min(1, (p.loss_aversion ?? 0) / 5),
      colour: biasColour(p.loss_aversion ?? 0, 1, 5),
      context: "Kahneman baseline: 2.0×",
    },
    {
      label: "Panic Threshold",
      displayValue: `−${Math.abs(p.panic_threshold_pct ?? 0).toFixed(0)}%`,
      barFraction: Math.min(1, Math.abs(p.panic_threshold_pct ?? 0) / 30),
      colour: biasColour(Math.abs(p.panic_threshold_pct ?? 0), 0, 30),
      context: "Drawdown that triggers panic sell",
    },
    {
      label: "Patience Score",
      displayValue: `${p.patience_score?.toFixed(1) ?? "—"}/10`,
      barFraction: Math.min(1, (p.patience_score ?? 0) / 10),
      colour: biasColour(p.patience_score ?? 0, 0, 10, true),
      context: "Higher = more long-term oriented",
    },
    {
      label: "Recency Bias",
      displayValue: `${p.recency_bias?.toFixed(2) ?? "—"}`,
      barFraction: Math.min(1, p.recency_bias ?? 0),
      colour: biasColour(p.recency_bias ?? 0, 0, 1),
      context: "0 = none, 1 = fully recency-driven",
    },
    {
      label: "Overconfidence",
      displayValue: `${p.overconfidence?.toFixed(2) ?? "—"}`,
      barFraction: Math.min(1, p.overconfidence ?? 0),
      colour: biasColour(p.overconfidence ?? 0, 0, 1),
      context: "Tendency to overestimate own judgement",
    },
    {
      label: "Herding Tendency",
      displayValue: `${p.herding_tendency?.toFixed(2) ?? "—"}`,
      barFraction: Math.min(1, p.herding_tendency ?? 0),
      colour: biasColour(p.herding_tendency ?? 0, 0, 1),
      context: "Tendency to follow crowd decisions",
    },
  ];

  return (
    <MagicCard gradientFrom={C.accent} gradientTo={C.teal} gradientOpacity={0.08} className="mb-4">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
        <Brain size={14} style={{ color: C.accent }} />
        Behavioural Bias Profile
      </div>
      <div className="p-4">
        {biases.map((b, i) => (
          <BiasRow key={b.label} {...b} delay={0.05 + i * 0.06} value={0} />
        ))}

        {/* Goal summary row */}
        {p.primary_goal && (
          <div
            className="mt-3 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: C.accent + "12", border: `1px solid ${C.accent}25` }}
          >
            <div className="text-muted-foreground mb-0.5">Primary goal</div>
            <div className="font-medium text-foreground/80">{p.primary_goal}</div>
            <div className="flex gap-3 mt-1.5 text-muted-foreground">
              <span>Horizon: <strong className="text-foreground">{p.goal_horizon_years} yrs</strong></span>
              <span>Confidence: <strong style={{ color: p.goal_confidence >= 70 ? C.green : p.goal_confidence >= 40 ? C.amber : C.red }}>{formatPct(p.goal_confidence)}</strong></span>
            </div>
          </div>
        )}
      </div>
    </MagicCard>
  );
}
