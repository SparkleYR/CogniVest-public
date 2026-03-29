import React from "react";
import { motion } from "motion/react";
import { C } from "../../utils/portfolio-helpers";

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: string;
  deltaPositive?: boolean;
  barColour: string;
  icon: React.ReactNode;
}

export function KPICard({ label, value, sub, delta, deltaPositive, barColour, icon }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative p-4 md:p-5 flex flex-col gap-2 h-full min-h-[120px] rounded-2xl overflow-hidden border border-border/60 hover:border-border hover:shadow-lg transition-all duration-300"
      style={{
        // Full card background gradient - fills entire card from top to bottom
        background: `linear-gradient(165deg, ${barColour}35 0%, ${barColour}20 35%, ${barColour}10 70%, transparent 100%)`,
      }}
    >
      {/* Top accent border glow */}
      <div 
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent 5%, ${barColour}90 50%, transparent 95%)`,
        }}
      />
      
      {/* Left side accent */}
      <div 
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{
          background: `linear-gradient(180deg, ${barColour}80 0%, ${barColour}40 50%, transparent 100%)`,
        }}
      />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: barColour + "40", color: barColour }}
        >
          {icon}
        </span>
      </div>
      <div className="text-2xl font-bold text-foreground tracking-tight relative z-10">
        {value}
      </div>
      {delta && (
        <div
          className="text-xs font-semibold relative z-10"
          style={{ color: deltaPositive ? C.green : C.red }}
        >
          {deltaPositive ? "↑" : "↓"} {delta}
        </div>
      )}
      {sub && <div className="text-xs text-muted-foreground relative z-10">{sub}</div>}
    </motion.div>
  );
}
