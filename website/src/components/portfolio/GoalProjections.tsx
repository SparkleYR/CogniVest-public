import React, { useState } from "react";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Target, TrendingUp } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinGoal, TwinGoalSummary } from "../../utils/cognivest-api";
import { C, formatINR, formatINRShort, scoreColour } from "../../utils/portfolio-helpers";

interface Props {
  goals: TwinGoal[];
  goalSummary: TwinGoalSummary;
}

function ScoreRing({ score, size = 44 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const colour = scoreColour(score);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[11px] font-bold font-mono"
        style={{ color: colour }}
      >
        {score}
      </span>
    </div>
  );
}

function projectSIP(
  monthlySip: number,
  returnPct: number,
  years: number,
  corpus: number
): { year: number; base: number; adjusted?: number }[] {
  const rm = returnPct / 100 / 12;
  return Array.from({ length: Math.ceil(years) + 1 }, (_, yr) => ({
    year: yr,
    base:
      corpus * Math.pow(1 + returnPct / 100, yr) +
      (rm > 0 ? monthlySip * ((Math.pow(1 + rm, yr * 12) - 1) / rm) : monthlySip * yr * 12),
  }));
}

function GoalCard({ goal, idx }: { goal: TwinGoal; idx: number }) {
  const [sipValue, setSipValue] = useState(goal.monthly_sip);
  const colour = scoreColour(goal.feasibility_score);
  const sipMin = Math.max(0, goal.monthly_sip - 20000);
  const sipMax = Math.max(goal.sip_needed * 1.3, goal.monthly_sip * 2);

  const baseData = projectSIP(goal.monthly_sip, goal.return_assumption, goal.horizon_years, goal.current_corpus);
  const adjData = projectSIP(sipValue, goal.return_assumption, goal.horizon_years, goal.current_corpus);

  const chartData = baseData.map((d, i) => ({
    year: d.year,
    current: Math.round(d.base),
    adjusted: Math.round(adjData[i]?.base ?? d.base),
    target: Math.round(goal.target_inflation_adj),
  }));

  const projectedFinal = adjData[adjData.length - 1]?.base ?? 0;
  const onTrackWithNew = projectedFinal >= goal.target_inflation_adj;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 + idx * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <MagicCard gradientFrom={colour} gradientTo={colour + "44"} gradientOpacity={0.1}>
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="overflow-hidden flex-1">
              <div className="font-semibold text-base truncate">{goal.goal_label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Priority {goal.priority} · {goal.horizon_years} yrs · {goal.goal_type} · {goal.return_assumption}% return assumed
              </div>
            </div>
            <ScoreRing score={goal.feasibility_score} />
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-border/40 mb-3">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (goal.total_projected / goal.target_inflation_adj) * 100)}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: colour }}
            />
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatBox
              label="Target (inflation adj.)"
              value={formatINRShort(goal.target_inflation_adj)}
              sub={`Today: ${formatINRShort(goal.target_today)}`}
              colour={C.amber}
            />
            <StatBox
              label="Total projected"
              value={formatINRShort(goal.total_projected)}
              sub={`Gap: ${formatINRShort(goal.gap)}`}
              colour={goal.on_track ? C.green : C.red}
            />
            <StatBox
              label="SIP gap"
              value={`${formatINR(goal.sip_gap)}/mo`}
              sub={`Need ${formatINR(goal.sip_needed)}`}
              colour={goal.sip_gap > 0 ? C.red : C.green}
            />
          </div>

          {/* Advisor note */}
          {goal.advisor_note && (
            <div
              className="text-xs px-3 py-2.5 rounded-xl mb-4 leading-relaxed"
              style={{
                background: C.amber + "15",
                border: `1px solid ${C.amber}30`,
                color: C.amber,
                borderLeft: `3px solid ${C.amber}80`,
              }}
            >
              {goal.advisor_note}
            </div>
          )}

          {/* SIP Explorer */}
          <div className="border-t border-border/30 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">What if I change my SIP?</span>
              <span className="text-xs text-muted-foreground">
                Current:{" "}
                <strong className="text-foreground font-mono">{formatINR(goal.monthly_sip)}/mo</strong>
              </span>
            </div>

            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground">Monthly SIP</span>
              <span className="font-mono font-bold text-sm" style={{ color: C.accent }}>
                {formatINR(sipValue)}/mo
              </span>
            </div>

            <input
              type="range"
              min={sipMin}
              max={sipMax}
              step={1000}
              value={sipValue}
              onChange={(e) => setSipValue(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer mb-3"
              style={{ accentColor: C.accent }}
            />

            {/* Projected result pill */}
            <div
              className="flex justify-between items-center px-4 py-2.5 rounded-xl mb-4 text-xs"
              style={{
                background: onTrackWithNew ? C.green + "15" : C.amber + "15",
                border: `1px solid ${onTrackWithNew ? C.green : C.amber}30`,
              }}
            >
              <span className="text-muted-foreground">Projected corpus at goal</span>
              <span
                className="font-mono font-bold text-sm"
                style={{ color: onTrackWithNew ? C.green : C.amber }}
              >
                {formatINRShort(projectedFinal)}
              </span>
            </div>

            {/* Area chart */}
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`baseGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.teal} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={`adjGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colour} stopOpacity={0.4} />
                      <stop offset="95%" stopColor={colour} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: C.text2 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `yr${v}`}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatINRShort(value),
                      name === "current" ? "Current SIP" : name === "adjusted" ? "Adjusted SIP" : "Target",
                    ]}
                    contentStyle={{
                      background: "#1c1c25",
                      border: "1px solid #2a2a35",
                      borderRadius: "10px",
                      fontSize: "11px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke={C.teal}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    fill={`url(#baseGrad-${idx})`}
                  />
                  <Area
                    type="monotone"
                    dataKey="adjusted"
                    stroke={colour}
                    strokeWidth={2}
                    fill={`url(#adjGrad-${idx})`}
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    stroke={C.amber}
                    strokeWidth={1}
                    strokeDasharray="2 4"
                    fill="none"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 justify-center">
              <Legend colour={C.teal} label="Current SIP" dashed />
              <Legend colour={colour} label="Adjusted SIP" />
              <Legend colour={C.amber} label="Target" dashed />
            </div>
          </div>
        </div>
      </MagicCard>
    </motion.div>
  );
}

function StatBox({
  label,
  value,
  sub,
  colour,
}: {
  label: string;
  value: string;
  sub?: string;
  colour: string;
}) {
  return (
    <div
      className="rounded-xl p-3"
      style={{ background: C.border + "60" }}
    >
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-bold font-mono" style={{ color: colour }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function Legend({ colour, label, dashed }: { colour: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-5 h-0.5 rounded-full"
        style={{
          background: colour,
          borderTop: dashed ? `2px dashed ${colour}` : `2px solid ${colour}`,
          height: "0px",
          width: "16px",
        }}
      />
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

export function GoalProjections({ goals, goalSummary: g }: Props) {
  const goalScore = g?.overall_score ?? 0;
  const scoreCol = scoreColour(goalScore);

  return (
    <div>
      {/* Overall score banner */}
      <MagicCard gradientFrom={scoreCol} gradientTo={scoreCol + "44"} className="mb-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="p-5 flex items-center gap-5"
        >
          <div
            className="text-4xl font-extrabold font-mono flex-shrink-0"
            style={{ color: scoreCol }}
          >
            {goalScore}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} style={{ color: scoreCol }} />
              <span className="text-sm font-semibold">Overall Goal Score</span>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">
              {g?.overall_verdict}
            </div>
            {(g?.total_sip_needed || g?.total_sip_current) && (
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-muted-foreground">
                  SIP current:{" "}
                  <strong className="text-foreground font-mono">
                    {formatINR(g.total_sip_current)}/mo
                  </strong>
                </span>
                <span className="text-muted-foreground">
                  SIP needed:{" "}
                  <strong className="font-mono" style={{ color: C.red }}>
                    {formatINR(g.total_sip_needed)}/mo
                  </strong>
                </span>
                <span className="text-muted-foreground">
                  Gap:{" "}
                  <strong className="font-mono" style={{ color: C.red }}>
                    {formatINR(g.total_sip_gap)}/mo
                  </strong>
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-[10px] text-muted-foreground mb-1">Surplus after goals</div>
            <div className="text-base font-bold font-mono" style={{ color: C.green }}>
              {formatINR(g?.surplus_after_goals)}/mo
            </div>
          </div>
        </motion.div>
      </MagicCard>

      {/* Per-goal cards */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
          <Target size={32} className="text-muted-foreground/25" />
          <div className="text-sm text-muted-foreground">No goal data yet</div>
          <div className="text-xs text-muted-foreground/60 max-w-xs">
            Per-goal projections and the SIP explorer will appear once the engine processes this client's financial goals.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {goals.map((goal, i) => (
            <GoalCard key={goal.goal_id ?? i} goal={goal} idx={i} />
          ))}
        </div>
      )}

      {/* Recommended actions */}
      {g?.recommended_actions && g.recommended_actions.length > 0 && (
        <MagicCard gradientFrom={C.amber} gradientTo={C.teal} className="mt-4">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
              <TrendingUp size={14} style={{ color: C.amber }} />
              Recommended Actions
            </div>
            <div className="space-y-2">
              {g.recommended_actions.map((action, i) => {
                const urgencyColour =
                  action.urgency === "immediate"
                    ? C.red
                    : action.urgency === "high"
                    ? C.amber
                    : action.urgency === "medium"
                    ? C.teal
                    : C.text2;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: urgencyColour + "12", border: `1px solid ${urgencyColour}25` }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                      style={{ background: urgencyColour }}
                    />
                    <div className="flex-1">
                      <span className="text-xs text-foreground/80">{action.message}</span>
                    </div>
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
                      style={{ color: urgencyColour }}
                    >
                      {action.urgency}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </MagicCard>
      )}
    </div>
  );
}
