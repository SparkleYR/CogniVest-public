import React from "react";
import { motion } from "motion/react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { PieChart as PieIcon, BarChart2 } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinPortfolioSnapshot } from "../../utils/cognivest-api";
import { C } from "../../utils/portfolio-helpers";

interface Props {
  portfolio: TwinPortfolioSnapshot;
}

const ALLOC_COLOURS: Record<string, string> = {
  equity: C.accent,
  international_equity: C.accentLight,
  alternative: C.amber,
  fixed_income: C.teal,
  retirement: C.green,
  hybrid: "#6ad4dd",
  cash: C.text2,
  debt: C.teal,
  gold: C.amber,
  liquid: "#6ad4dd",
};

function fmtLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const CAP_COLOURS: Record<string, string> = {
  Large: C.accent,
  Mid: C.accentLight,
  Small: "#224477ff",
};

export function AllocationSection({ portfolio: p }: Props) {
  const allocEntries = Object.entries(p.asset_allocation ?? {}).filter(([, v]) => v > 0);
  const capEntries = Object.entries(p.equity_cap_split ?? {}).filter(([, v]) => v > 0);

  const pieData = allocEntries.map(([name, value]) => ({ name: fmtLabel(name), value, key: name }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Donut chart */}
      <MagicCard gradientFrom={C.accent} gradientTo={C.teal} gradientOpacity={0.1}>
        <div>
          <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
            <PieIcon size={14} style={{ color: C.accent }} />
            Asset Allocation
          </div>
          <div className="p-5">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={ALLOC_COLOURS[entry.key] ?? C.text2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                    contentStyle={{
                      background: "#1c1c25",
                      border: "1px solid #2a2a35",
                      borderRadius: "10px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
              {allocEntries.map(([name, value]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                    style={{ background: ALLOC_COLOURS[name] ?? C.text2 }}
                  />
                  <span className="text-xs text-muted-foreground">{fmtLabel(name)}</span>
                  <span
                    className="text-xs font-bold font-mono"
                    style={{ color: ALLOC_COLOURS[name] ?? C.text2 }}
                  >
                    {value.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>

            {/* Allocation bars */}
            <div className="mt-4 space-y-2.5">
              {allocEntries.map(([name, value]) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-muted-foreground w-28 flex-shrink-0 truncate">{fmtLabel(name)}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-border/40">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${value}%`,
                        background: ALLOC_COLOURS[name] ?? C.text2,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-bold font-mono w-10 text-right"
                    style={{ color: ALLOC_COLOURS[name] ?? C.text2 }}
                  >
                    {value.toFixed(1)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </MagicCard>

      {/* Cap split */}
      <MagicCard gradientFrom={C.accentLight} gradientTo={C.accent} gradientOpacity={0.1}>
        <div>
          <div className="px-5 py-3.5 border-b border-border/30 flex
           items-center gap-2 text-sm font-semibold">
            <BarChart2 size={14} style={{ color: C.accent }} />
            Equity Cap Split
          </div>
          <div className="p-5">
            {capEntries.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No equity cap data available.
              </div>
            ) : (
              <div className="space-y-5">
                {capEntries.map(([cap, pct]) => (
                  <div key={cap}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">{cap} Cap</span>
                      <span
                        className="text-sm font-bold font-mono"
                        style={{ color: CAP_COLOURS[cap] ?? C.accent }}
                      >
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-border/40">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: CAP_COLOURS[cap] ?? C.accent }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* HHI concentration note */}
            {p.hhi_concentration != null && (
              <div
                className="mt-5 px-4 py-3 rounded-xl text-xs"
                style={{
                  background: C.border + "50",
                  border: `1px solid ${C.border}`,
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Concentration (HHI)</span>
                  <span
                    className="font-bold font-mono"
                    style={{
                      color:
                        p.hhi_concentration > 0.25
                          ? C.red
                          : p.hhi_concentration > 0.10
                            ? C.amber
                            : C.green,
                    }}
                  >
                    {p.hhi_concentration.toFixed(3)}
                  </span>
                </div>
                {p.hhi_interpretation && (
                  <div className="text-muted-foreground mt-1">{p.hhi_interpretation}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </MagicCard>
    </div>
  );
}
