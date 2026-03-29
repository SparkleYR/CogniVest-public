import React from "react";
import { motion } from "motion/react";
import { MessageSquare } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import { C } from "../../utils/portfolio-helpers";

interface Props {
  points: string[];
}

export function TalkingPoints({ points }: Props) {
  if (!points || points.length === 0) return null;

  return (
    <MagicCard gradientFrom={C.accent} gradientTo={C.teal} gradientOpacity={0.1} className="mt-4 mb-4">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
          <MessageSquare size={14} style={{ color: C.accent }} />
          Advisor Talking Points
        </div>
        <ol className="space-y-3">
          {points.map((point, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + i * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-3"
            >
              <span
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: C.accent + "22", color: C.accent }}
              >
                {i + 1}
              </span>
              <span className="text-sm text-foreground/80 leading-relaxed">{point}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </MagicCard>
  );
}
