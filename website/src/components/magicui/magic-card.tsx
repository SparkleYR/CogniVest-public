"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientOpacity?: number;
}

export function MagicCard({
  children,
  className,
  gradientFrom = "#9E7AFF",
  gradientTo = "#FE8BBB",
}: MagicCardProps) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-border hover:shadow-lg",
        className
      )}
      style={{
        boxShadow: `0 0 0 1px rgba(255,255,255,0.05) inset`,
      }}
    >
      {/* Subtle gradient accent on top border */}
      <div 
        className="absolute inset-x-0 top-0 h-px opacity-40 group-hover:opacity-70 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent, ${gradientFrom}50, ${gradientTo}50, transparent)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
