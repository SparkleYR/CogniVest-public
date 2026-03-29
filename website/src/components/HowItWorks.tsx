import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChromaText } from "./ui/textRenderAppear";
import { BlurFade } from "./magicui/blur-fade";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import PsychologyIcon from "@mui/icons-material/Psychology";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";

// Wrapper that triggers ChromaText on scroll-into-view
const VisibleChromaText: React.FC<{
  children: React.ReactNode;
  id: string;
  className?: string;
  delay?: number;
  duration?: number;
}> = ({ children, id, className, delay = 0.1, duration = 0.9 }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  return (
    <span ref={ref}>
      {hasAnimated ? (
        <ChromaText id={id} className={className} delay={delay} duration={duration}>
          {children}
        </ChromaText>
      ) : (
        <span className={className} style={{ opacity: 0 }}>
          {children}
        </span>
      )}
    </span>
  );
};

const steps = [
  {
    number: "01",
    title: "Tell us what matters",
    description:
      "Not a questionnaire — a conversation. You tell us your goals, life stage, and what financial security means to you. A house, early retirement, your children's education. All of it, weighted by how much it matters.",
    icon: <ChatBubbleOutlineIcon style={{ fontSize: 32 }} />,
    accentColor: "from-blue-500/20 to-cyan-500/10",
    borderAccent: "group-hover:border-blue-500/30",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  {
    number: "02",
    title: "We model how you think",
    description:
      "Through scenario-based questions, we map your real risk tolerance — not what you say in a form, but how you actually react when markets move. We build a behavioural fingerprint unique to you.",
    icon: <PsychologyIcon style={{ fontSize: 32 }} />,
    accentColor: "from-amber-500/20 to-orange-500/10",
    borderAccent: "group-hover:border-amber-500/30",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
  },
  {
    number: "03",
    title: "Your twin generates your portfolio",
    description:
      "Every allocation decision is explained in plain language, tied back to what you told us. As your life changes and markets move, the twin updates — keeping your portfolio aligned with your actual self.",
    icon: <AutoGraphIcon style={{ fontSize: 32 }} />,
    accentColor: "from-emerald-500/20 to-teal-500/10",
    borderAccent: "group-hover:border-emerald-500/30",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
];

const HowItWorks: React.FC = () => {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Subtle radial gradient bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, hsla(220, 60%, 20%, 0.15), transparent 70%)",
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <BlurFade delay={0.1}>
            <span className="inline-block mb-4 text-xs font-mono tracking-[0.2em] uppercase text-muted-foreground border border-border rounded-full px-4 py-1.5 bg-secondary/50">
              How It Works
            </span>
          </BlurFade>
          <BlurFade delay={0.25}>
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-5 leading-tight">
              Three steps to a portfolio
              <br />
              <VisibleChromaText id="how-it-works-subtitle" delay={0.3} duration={1.4}>
                that knows you
              </VisibleChromaText>
            </h2>
          </BlurFade>
        </div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <BlurFade key={index} delay={0.3 + index * 0.15}>
              <motion.div
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="group relative h-full"
              >
                <div
                  className={`relative h-full flex flex-col rounded-2xl border border-border/30 ${step.borderAccent} bg-card/50 backdrop-blur-sm p-8 transition-all duration-300 overflow-hidden`}
                >
                  {/* Background gradient on hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${step.accentColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
                  />

                  {/* Content */}
                  <div className="relative z-10">
                    {/* Step Number & Icon Row */}
                    <div className="flex items-center justify-between mb-8">
                      <span
                        className="text-6xl font-bold text-foreground/[0.06] group-hover:text-foreground/[0.12] transition-colors duration-300"
                        style={{ fontFamily: "'Fascinate', cursive" }}
                      >
                        {step.number}
                      </span>
                      <div
                        className={`w-14 h-14 rounded-xl ${step.iconBg} ${step.iconColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                      >
                        {step.icon}
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-4 leading-snug">
                      {step.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[15px] leading-relaxed text-muted-foreground group-hover:text-foreground/70 transition-colors duration-300">
                      {step.description}
                    </p>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              </motion.div>
            </BlurFade>
          ))}
        </div>

        {/* Connecting line between cards (desktop only) */}
        <div className="hidden md:flex items-center justify-center mt-12 gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-foreground/10"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
