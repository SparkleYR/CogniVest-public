import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, CheckCircle2, Quote, ChevronDown } from "lucide-react";
import { MagicCard } from "../magicui/magic-card";
import type { TwinBehaviourProfile } from "../../utils/cognivest-api";
import { C } from "../../utils/portfolio-helpers";

interface Props {
  profile: TwinBehaviourProfile;
}

function Section({
  title,
  icon,
  colour,
  items,
  renderItem,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  colour: string;
  items: string[];
  renderItem: (item: string, i: number) => React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2" style={{ color: colour }}>
          {icon}
          {title}
          <span
            className="text-[10px] font-normal px-1.5 py-0.5 rounded-full"
            style={{ background: colour + "20", color: colour }}
          >
            {items.length}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="pt-1 space-y-1.5">
              {items.map((item, i) => renderItem(item, i))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BehaviourSignals({ profile: p }: Props) {
  const hasAny =
    (p.anxiety_triggers?.length ?? 0) > 0 ||
    (p.positive_signals?.length ?? 0) > 0 ||
    (p.key_quotes?.length ?? 0) > 0;

  if (!hasAny) return null;

  return (
    <MagicCard gradientFrom={C.teal} gradientTo={C.accent} gradientOpacity={0.07} className="mb-4">
      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
        <Quote size={14} style={{ color: C.teal }} />
        Signals &amp; Evidence
      </div>
      <div className="p-4">

        <Section
          title="Anxiety Triggers"
          icon={<AlertTriangle size={12} />}
          colour={C.red}
          items={p.anxiety_triggers ?? []}
          renderItem={(item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: C.red + "12", border: `1px solid ${C.red}20` }}
            >
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1" style={{ background: C.red }} />
              <span className="text-foreground/80">{item}</span>
            </motion.div>
          )}
        />

        <Section
          title="Positive Signals"
          icon={<CheckCircle2 size={12} />}
          colour={C.green}
          items={p.positive_signals ?? []}
          renderItem={(item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: C.green + "12", border: `1px solid ${C.green}20` }}
            >
              <CheckCircle2 size={11} className="flex-shrink-0 mt-0.5" style={{ color: C.green }} />
              <span className="text-foreground/80">{item}</span>
            </motion.div>
          )}
        />

        <Section
          title="Key Quotes"
          icon={<Quote size={12} />}
          colour={C.amber}
          items={p.key_quotes ?? []}
          defaultOpen={false}
          renderItem={(item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="px-3 py-2.5 rounded-lg text-xs italic leading-relaxed"
              style={{
                background: C.amber + "10",
                borderLeft: `3px solid ${C.amber}60`,
                color: "hsl(var(--muted-foreground))",
              }}
            >
              "{item}"
            </motion.div>
          )}
        />
      </div>
    </MagicCard>
  );
}
