import React from "react";
import { motion } from "motion/react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { TwinFlag } from "../../utils/cognivest-api";
import { C } from "../../utils/portfolio-helpers";

interface Props {
  flags: TwinFlag[];
}

export function FlagsBar({ flags }: Props) {
  const visible = flags.filter((f) => f.severity !== "info").slice(0, 6);
  const infoFlags = flags.filter((f) => f.severity === "info");
  if (visible.length === 0 && infoFlags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-1.5 mb-4"
    >
      {visible.map((flag, i) => {
        const isCritical = flag.severity === "critical";
        const colour = isCritical ? C.red : C.amber;
        const Icon = isCritical ? AlertTriangle : AlertCircle;
        return (
          <div
            key={i}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs"
            style={{
              background: colour + "18",
              border: `1px solid ${colour}30`,
              color: colour,
            }}
          >
            <Icon size={13} className="flex-shrink-0" />
            <span className="flex-1">{flag.message}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider ml-auto flex-shrink-0"
              style={{ color: colour }}
            >
              {flag.severity}
            </span>
          </div>
        );
      })}
      {infoFlags.length > 0 && (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs"
          style={{
            background: C.text2 + "15",
            border: `1px solid ${C.border}`,
            color: C.text2,
          }}
        >
          <Info size={13} className="flex-shrink-0" />
          <span className="flex-1">{infoFlags[0].message}</span>
          {infoFlags.length > 1 && (
            <span className="text-[9px] font-bold ml-auto flex-shrink-0">
              +{infoFlags.length - 1} more
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
