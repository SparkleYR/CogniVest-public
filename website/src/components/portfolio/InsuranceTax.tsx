import React from "react";
import { motion } from "motion/react";
import { Shield, Calculator, AlertTriangle, Clock } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinInsurance, TwinTax } from "../../utils/cognivest-api";
import { C, formatINR } from "../../utils/portfolio-helpers";

interface Props {
  insurance: TwinInsurance | null;
  tax: TwinTax | null;
}

function PendingCard({ icon, title, colour }: { icon: React.ReactNode; title: string; colour: string }) {
  return (
    <MagicCard gradientFrom={colour} gradientOpacity={0.08}>
      <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center">
        <Clock size={28} className="text-muted-foreground/30" />
        <div className="text-sm text-muted-foreground">Awaiting engine data</div>
        <div className="text-xs text-muted-foreground/60">
          This section populates once the digital twin engine has processed the client profile.
        </div>
      </div>
    </MagicCard>
  );
}

function InsuranceRow({ label, value, isGap }: { label: string; value: string; isGap?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/30 last:border-none">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono font-semibold" style={{ color: isGap ? C.red : undefined }}>
        {value}
      </span>
    </div>
  );
}

function ScoreRing({ score, max = 10 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const colour = pct >= 60 ? C.green : pct >= 40 ? C.amber : C.red;
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke={C.border} strokeWidth="3.5" />
        <circle
          cx="24" cy="24" r={r} fill="none"
          stroke={colour} strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono" style={{ color: colour }}>
        {score}/{max}
      </span>
    </div>
  );
}

export function InsuranceTax({ insurance: ins, tax }: Props) {
  const urgencyColour = (u: string) =>
    u === "immediate" ? C.red : u === "high" ? C.amber : u === "medium" ? C.teal : C.text2;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      {/* Insurance */}
      {!ins ? (
        <PendingCard
          icon={<Shield size={14} style={{ color: C.amber }} />}
          title="Insurance Audit"
          colour={C.amber}
        />
      ) : (
      <MagicCard gradientFrom={C.amber} gradientTo={C.red} gradientOpacity={0.1}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="px-5 py-3.5 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield size={14} style={{ color: C.amber }} />
              Insurance Audit
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: C.amber + "20", color: C.amber }}
            >
              Score {ins.adequacy_score}/10
            </span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-5">
              <ScoreRing score={ins.adequacy_score} />
              <div>
                <div className="text-sm font-bold">
                  {ins.adequacy_score >= 7 ? "Well Covered" : ins.adequacy_score >= 4 ? "Under-Insured" : "Critical Gap"}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {ins.flags?.length ?? 0} insurance flag{ins.flags?.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Term life */}
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">
              Term Life Insurance
            </div>
            <InsuranceRow label="Recommended cover" value={formatINR(ins.term?.recommended_cover)} />
            <InsuranceRow label="Current cover" value={formatINR(ins.term?.current_cover)} isGap={!!ins.term?.coverage_gap} />
            <InsuranceRow label="Coverage gap" value={formatINR(ins.term?.coverage_gap)} isGap />
            {ins.term?.human_life_value != null && (
              <InsuranceRow label="HLV method" value={formatINR(ins.term.human_life_value)} />
            )}

            {/* Health */}
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2 mt-4">
              Health Insurance
            </div>
            <InsuranceRow label="Recommended" value={formatINR(ins.health?.recommended_cover)} />
            <InsuranceRow label="Current" value={formatINR(ins.health?.current_cover)} isGap={!!ins.health?.coverage_gap} />
            <InsuranceRow label="Gap" value={formatINR(ins.health?.coverage_gap)} isGap />

            {/* Action items */}
            {ins.action_items && ins.action_items.length > 0 && (
              <div className="mt-4 space-y-2">
                {ins.action_items.map((item, i) => {
                  const uc = urgencyColour(item.urgency);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs"
                      style={{ background: uc + "12", border: `1px solid ${uc}25` }}
                    >
                      <AlertTriangle size={11} style={{ color: uc, flexShrink: 0, marginTop: 1 }} />
                      <span className="flex-1 text-foreground/80">{item.message}</span>
                      <span className="text-[9px] font-bold uppercase flex-shrink-0" style={{ color: uc }}>
                        {item.urgency}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </MagicCard>
      )}

      {/* Tax */}
      {!tax ? (
        <PendingCard
          icon={<Calculator size={14} style={{ color: C.green }} />}
          title="Tax Optimisation"
          colour={C.green}
        />
      ) : (
      <MagicCard gradientFrom={C.green} gradientTo={C.teal} gradientOpacity={0.1}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="px-5 py-3.5 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calculator size={14} style={{ color: C.green }} />
              Tax Optimisation
            </div>
            <span
              className="text-xs font-mono font-bold"
              style={{ color: C.green }}
            >
              Saving: {formatINR(tax.total_potential_tax_saving)}
            </span>
          </div>
          <div className="p-5">
            {/* Total saving */}
            <div className="mb-5">
              <div className="text-3xl font-bold font-mono" style={{ color: C.green }}>
                {formatINR(tax.total_potential_tax_saving)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">total annual tax saving available</div>
            </div>

            {/* Optimal regime */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
              style={{ background: C.green + "15", border: `1px solid ${C.green}30` }}
            >
              <div>
                <div className="text-[10px] text-muted-foreground">Optimal regime</div>
                <div className="text-sm font-bold capitalize" style={{ color: C.green }}>
                  {tax.optimal_regime} regime
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground">saves</div>
                <div className="font-mono font-bold text-sm" style={{ color: C.green }}>
                  {formatINR(tax.regime_saving_inr)}/yr
                </div>
              </div>
            </div>

            {/* 80C bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Section 80C utilised</span>
                <span className="font-mono">
                  <span style={{ color: C.teal }}>{formatINR(tax.total_80c_utilised)}</span>
                  <span className="text-muted-foreground"> / {formatINR(tax.total_80c_available)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-border/40">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (tax.total_80c_utilised / (tax.total_80c_available || 150000)) * 100)}%` }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: C.teal }}
                />
              </div>
              {tax.total_80c_gap > 0 && (
                <div className="text-[10px] mt-1" style={{ color: C.amber }}>
                  Gap: {formatINR(tax.total_80c_gap)} unused
                </div>
              )}
            </div>

            {/* Action items */}
            {tax.action_items && tax.action_items.length > 0 && (
              <div className="space-y-2">
                {tax.action_items.map((item, i) => {
                  const uc = urgencyColour(item.urgency);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-xs"
                      style={{ background: uc + "12", border: `1px solid ${uc}25` }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
                        style={{ background: uc }}
                      />
                      <span className="flex-1 text-foreground/80">{item.message}</span>
                      {item.saving_inr != null && (
                        <span className="font-mono font-bold flex-shrink-0" style={{ color: C.green }}>
                          +{formatINR(item.saving_inr)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </MagicCard>
      )}
    </div>
  );
}
