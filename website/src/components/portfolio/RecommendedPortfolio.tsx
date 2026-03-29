import React from "react";
import { motion } from "motion/react";
import { Sparkles, CheckCircle2, Lock } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinRecommendedPortfolio } from "../../utils/cognivest-api";
import { C, formatINR } from "../../utils/portfolio-helpers";

interface Props {
  rec: TwinRecommendedPortfolio;
}

const REC_ALLOC_COLOURS: Record<string, string> = {
  equity: C.accent,
  debt: C.teal,
  gold: C.amber,
  liquid: C.green,
};

export function RecommendedPortfolio({ rec }: Props) {
  const allocEntries = Object.entries(rec.allocation ?? {});
  const taxSavingTotal = (rec.elss_sip ?? 0) * 12 + (rec.ppf_annual ?? 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 mb-4">
      {/* Fund table */}
      <MagicCard gradientFrom={C.green} gradientTo={C.teal} gradientOpacity={0.1}>
        <div>
          <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
            <Sparkles size={14} style={{ color: C.green }} />
            Recommended Funds
            <span className="ml-auto text-xs text-muted-foreground font-normal font-mono">
              Total SIP: {formatINR(rec.total_monthly_sip)}/mo
            </span>
          </div>

          {/* Header */}
          <div
            className="grid gap-2 px-5 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30"
            style={{ gridTemplateColumns: "2.5fr 80px 90px 80px" }}
          >
            <span>Fund</span>
            <span className="text-right">Alloc</span>
            <span className="text-right">SIP/mo</span>
            <span className="text-center">Tax</span>
          </div>

          {(rec.funds ?? []).map((fund, i) => (
            <motion.div
              key={fund.fund_name}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid items-center gap-2 px-5 py-3 border-b border-border/50 hover:bg-muted/20 transition-colors"
              style={{ gridTemplateColumns: "2.5fr 80px 90px 80px" }}
            >
              <div className="overflow-hidden">
                <div className="text-xs font-medium truncate">{fund.fund_name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: C.accent + "20", color: C.accent }}
                  >
                    {fund.category}
                  </span>
                  {fund.lock_in_years > 0 && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <Lock size={9} />
                      {fund.lock_in_years}yr
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs font-bold font-mono" style={{ color: C.amber }}>
                {fund.allocation_pct.toFixed(1)}%
              </div>
              <div className="text-right text-xs font-mono">{formatINR(fund.monthly_sip)}</div>
              <div className="text-center">
                {fund.tax_benefit && fund.tax_benefit !== "None" && fund.tax_benefit !== "" ? (
                  <span title={typeof fund.tax_benefit === "string" ? fund.tax_benefit : ""}>
                    <CheckCircle2 size={14} style={{ color: C.green }} />
                  </span>
                ) : (
                  <span className="text-[9px] text-muted-foreground">—</span>
                )}
              </div>
            </motion.div>
          ))}

          {/* Tax saving products */}
          {rec.tax_saving_products && rec.tax_saving_products.length > 0 && (
            <div
              className="px-5 py-4"
              style={{ background: C.green + "08", borderTop: `1px solid ${C.border}` }}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                Tax saving products
              </div>
              <div className="flex flex-wrap gap-2">
                {rec.tax_saving_products.map((p, i) => (
                  <div
                    key={i}
                    className="text-xs px-3 py-1.5 rounded-xl"
                    style={{ background: C.green + "18", border: `1px solid ${C.green}30`, color: C.green }}
                  >
                    <span className="font-semibold">{p.product}</span>
                    {p.section && (
                      <span className="ml-2 text-[10px] opacity-70">§{p.section}</span>
                    )}
                    {p.tax_saving != null && (
                      <span className="ml-2 font-mono">saves ₹{Math.round(p.tax_saving).toLocaleString("en-IN")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </MagicCard>

      {/* Allocation + rationale */}
      <div className="flex flex-col gap-4">
        <MagicCard gradientFrom={C.accent} gradientTo={C.green} gradientOpacity={0.1}>
          <div className="p-5">
            <div className="text-sm font-semibold mb-4">Recommended Allocation</div>
            <div className="space-y-3">
              {allocEntries.map(([key, pct]) => {
                const colour = REC_ALLOC_COLOURS[key] ?? C.text2;
                return (
                  <div key={key}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs capitalize text-muted-foreground">{key}</span>
                      <span className="text-xs font-bold font-mono" style={{ color: colour }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border/40">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        style={{ background: colour }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Key product metrics */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "ELSS/mo", value: formatINR(rec.elss_sip), colour: C.accent },
                { label: "NPS/mo", value: formatINR(rec.nps_monthly), colour: C.teal },
                { label: "PPF/yr", value: formatINR(rec.ppf_annual), colour: C.amber },
              ].map(({ label, value, colour }) => (
                <div
                  key={label}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: colour + "12" }}
                >
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
                    {label}
                  </div>
                  <div className="text-xs font-bold font-mono" style={{ color: colour }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </MagicCard>

        {/* Rationale */}
        {rec.allocation_rationale && (
          <MagicCard gradientFrom={C.teal} gradientTo={C.accent} gradientOpacity={0.1}>
            <div className="p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Rationale
              </div>
              <p className="text-sm text-foreground/75 leading-relaxed italic">
                {rec.allocation_rationale}
              </p>
              {taxSavingTotal > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Annual tax saving products:{" "}
                  <span className="font-mono font-bold" style={{ color: C.green }}>
                    {formatINR(taxSavingTotal)}
                  </span>
                </div>
              )}
            </div>
          </MagicCard>
        )}
      </div>
    </div>
  );
}
