import React from "react";
import { motion } from "motion/react";
import type { TwinOutput } from "../../utils/cognivest-api";
import { C, avatarColour, getInitials, formatDate } from "../../utils/portfolio-helpers";

interface Props {
  twin: TwinOutput;
}

export function ClientHeader({ twin }: Props) {
  const s = twin?.client_summary;
  const computed_at = twin?.computed_at;
  const criticalCount = (twin?.flags ?? []).filter((f) => f.severity === "critical").length;
  const goalScore = twin?.goal_summary?.overall_score ?? null;

  const confidence = s?.twin_confidence != null ? Math.round(s.twin_confidence * 100) : null;

  const goalColour =
    goalScore == null ? C.text2
    : goalScore >= 65 ? C.green
    : goalScore >= 40 ? C.amber
    : C.red;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm mb-4"
    >
      {/* Avatar + info */}
      <div className="flex items-center gap-4 overflow-hidden">
        <div
          className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold text-white shadow-lg"
          style={{ background: avatarColour(s?.client_id ?? "") }}
        >
          {getInitials(s?.name)}
        </div>
        <div className="overflow-hidden">
          <div className="text-xl font-bold tracking-tight truncate">{s?.name ?? "—"}</div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {[s?.age ? `Age ${s.age}` : null, s?.occupation, s?.city].filter(Boolean).join(" · ")}
          </div>
          {s?.primary_concern && (
            <div className="text-xs text-muted-foreground mt-0.5 italic truncate max-w-sm">
              "{s.primary_concern}"
            </div>
          )}
          {/* Chips */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {s?.risk_label && (
              <Chip colour={C.accent}>{s.risk_label}</Chip>
            )}
            {criticalCount > 0 && (
              <Chip colour={C.red}>{criticalCount} critical flag{criticalCount !== 1 ? "s" : ""}</Chip>
            )}
            {goalScore != null && (
              <Chip colour={goalColour}>Goal score {goalScore}/100</Chip>
            )}
            {confidence != null && (
              <Chip colour={C.teal}>Twin confidence {confidence}%</Chip>
            )}
          </div>
        </div>
      </div>

      {/* Engine badge */}
      <div className="flex-shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: C.green,
            boxShadow: `0 0 0 3px ${C.green}33`,
            animation: "pulse 2s ease infinite",
          }}
        />
        <div className="text-right">
          <div className="font-medium text-foreground/70">11 agents</div>
          {computed_at && (
            <div className="text-[10px] text-muted-foreground">{formatDate(computed_at)}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Chip({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: colour + "20",
        color: colour,
        border: `1px solid ${colour}40`,
      }}
    >
      {children}
    </span>
  );
}
