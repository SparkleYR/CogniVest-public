import React from "react";
import { motion } from "motion/react";
import { Layers } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinHolding } from "../../utils/cognivest-api";
import { C, formatINR, formatPct } from "../../utils/portfolio-helpers";

interface Props {
  holdings: TwinHolding[];
}

const ASSET_CLASS_COLOURS: Record<string, string> = {
  Equity: C.accent,
  Debt: C.teal,
  Gold: C.amber,
  Hybrid: C.green,
  "Real Estate": C.red,
};

export function HoldingsTable({ holdings }: Props) {
  const sorted = [...holdings].sort((a, b) => (b.weight_pct ?? 0) - (a.weight_pct ?? 0));

  return (
    <MagicCard gradientFrom={C.accent} gradientTo={C.teal} gradientOpacity={0.1} className="mb-4">
      <div className="overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
          <Layers size={14} style={{ color: C.accent }} />
          Current Holdings
          <span className="ml-auto text-xs text-muted-foreground font-normal">
            {holdings.length} positions
          </span>
        </div>

        {/* Header */}
        <div
          className="grid gap-3 px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30"
          style={{ gridTemplateColumns: "2.5fr 1fr 1fr 80px 80px" }}
        >
          <span>Holding</span>
          <span className="text-right">Current Value</span>
          <span className="text-right">Gain</span>
          <span className="text-right">CAGR / Return</span>
          <span className="text-right">Weight</span>
        </div>

        {sorted.length === 0 && (
          <div className="py-8 px-5 text-center text-muted-foreground text-sm">
            No holdings data available.
          </div>
        )}

        {sorted.map((h, i) => {
          const assetColour = ASSET_CLASS_COLOURS[h.asset_class] ?? C.text2;
          const gainPositive = (h.gain_pct ?? 0) >= 0;
          const gainColour = gainPositive ? C.green : C.red;

          return (
            <motion.div
              key={`${h.name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid items-center gap-3 px-5 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors"
              style={{ gridTemplateColumns: "2.5fr 1fr 1fr 80px 80px" }}
            >
              {/* Name + type */}
              <div className="overflow-hidden">
                <div className="text-sm font-medium truncate">{h.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: assetColour + "20", color: assetColour }}
                  >
                    {h.asset_class}
                  </span>
                  {h.sub_type && (
                    <span className="text-[10px] text-muted-foreground">{h.sub_type}</span>
                  )}
                </div>
              </div>

              {/* Current value */}
              <div className="text-right text-sm font-semibold font-mono">
                {formatINR(h.current_value)}
              </div>

              {/* Gain */}
              <div className="text-right text-sm font-semibold font-mono" style={{ color: gainColour }}>
                {gainPositive ? "+" : ""}{formatPct(h.gain_pct)}
              </div>

              {/* CAGR / days */}
              <div className="text-right">
                {h.holding_days != null ? (
                  <>
                    <div className="text-xs font-mono" style={{ color: C.teal }}>
                      {((h.holding_days / 365)).toFixed(1)}yr
                    </div>
                    <div className="text-[10px] text-muted-foreground">{h.holding_days}d</div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Weight bar */}
              <div className="text-right">
                <div className="text-xs font-bold font-mono mb-1" style={{ color: assetColour }}>
                  {formatPct(h.weight_pct)}
                </div>
                <div className="h-1 rounded-full bg-border/40">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, h.weight_pct ?? 0)}%`, background: assetColour }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </MagicCard>
  );
}
