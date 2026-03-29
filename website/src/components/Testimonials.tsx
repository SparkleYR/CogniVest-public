import React, { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BlurFade } from "./magicui/blur-fade";

/* ─────────── Data ─────────── */

interface Testimonial {
  quote: string;
  body: string;
  name: string;
  role: string;
  x: number;
  y: number;
}

// Uneven, scattered, non-overlapping coordinates spanning a wide bounds
const testimonials: Testimonial[] = [
  {
    quote: "Changed my entire perspective",
    body: "It asked me about how I felt during COVID crash. No advisor ever asked me that. Then it showed me what that panic selling cost me — ₹8 lakhs. I was stunned.",
    name: "Rahul M.",
    role: "Software engineer, Pune",
    x: -600,
    y: -350,
  },
  {
    quote: "Skipped the boring part",
    body: "My advisor already knew my full situation before our first call. We skipped the boring part and went straight to strategy. Never had that before.",
    name: "Priya S.",
    role: "Entrepreneur, Mumbai",
    x: 150,
    y: -420,
  },
  {
    quote: "Genuinely eye-opening",
    body: "I just asked about SIP vs lumpsum and suddenly it was helping me understand my own investment psychology. Genuinely eye-opening.",
    name: "Anil K.",
    role: "Doctor, Bengaluru",
    x: 750,
    y: -250,
  },
  {
    quote: "Changed how I manage",
    body: "I used to get three anxious calls every time markets dipped. CogniVest showed me which clients were approaching their threshold before the volatility hit. Changed how I manage the entire book.",
    name: "Marcus K.",
    role: "Portfolio manager, 12 years",
    x: -350,
    y: 100,
  },
  {
    quote: "Every decision explained",
    body: "For the first time I actually understand why my portfolio is structured the way it is. Every decision is explained in terms of what I told them I care about.",
    name: "Sarah A.",
    role: "Retired teacher, age 58",
    x: 450,
    y: 120,
  },
  {
    quote: "I trust the twin more than my gut",
    body: "I was skeptical about an AI understanding my risk appetite. Then it predicted I'd sell during the February dip — and I almost did. Now I trust the twin more than my gut.",
    name: "Vikram T.",
    role: "CFO, Hyderabad",
    x: -850,
    y: 200,
  },
  {
    quote: "Like having a patient mentor",
    body: "As a first-time investor, everything felt overwhelming. CogniVest broke it down into language I actually understood. It felt like having a patient mentor, not a dashboard.",
    name: "Neha R.",
    role: "Product designer, Delhi",
    x: 0,
    y: 400,
  },
  {
    quote: "The patterns blew my mind",
    body: "The behavioural fingerprint concept blew my mind. I never realized how much my childhood shaped my money decisions until the twin showed me the patterns.",
    name: "David L.",
    role: "Psychologist & investor, age 44",
    x: 650,
    y: 450,
  },
];

/* ─────────── Helpers ─────────── */

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const avatarColors = [
  "from-blue-400 to-indigo-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-600",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500",
  "from-fuchsia-400 to-pink-600",
];

/* ─────────── Review Card ─────────── */

const ReviewCard: React.FC<{
  t: Testimonial;
  index: number;
  isFocused: boolean;
  isFreeMode: boolean;
  onCardClick: () => void;
}> = ({ t, index, isFocused, isFreeMode, onCardClick }) => (
  <motion.div
    className="absolute w-[340px] cursor-pointer"
    style={{
      left: t.x,
      top: t.y,
      x: "-50%",
      y: "-50%",
    }}
    animate={{
      scale: isFocused ? 1.05 : isFreeMode ? 1 : 0.85,
      opacity: isFocused ? 1 : isFreeMode ? 0.9 : 0.2,
      filter: isFocused
        ? "blur(0px)"
        : isFreeMode
        ? "blur(0px)"
        : "blur(4px)",
    }}
    transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
    onClick={onCardClick}
    whileHover={
      !isFocused
        ? { opacity: 1, scale: 1.02, filter: "blur(0px)" }
        : {}
    }
  >
    <div className="rounded-2xl border border-white/[0.08] bg-neutral-900/95 backdrop-blur-xl p-6 shadow-2xl shadow-black/50">
      <p className="text-[15px] font-semibold text-white mb-3">
        &ldquo;{t.quote}&rdquo;
      </p>
      <p className="text-[14px] leading-relaxed text-neutral-400 mb-5">
        {t.body}
      </p>
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-full bg-gradient-to-br ${
            avatarColors[index % avatarColors.length]
          } flex items-center justify-center text-white text-[11px] font-bold shadow-sm`}
        >
          {getInitials(t.name)}
        </div>
        <span className="text-sm font-medium text-neutral-300">{t.name}</span>
      </div>
    </div>
  </motion.div>
);

/* ─────────── Main Component ─────────── */

// How far down from the vertical center of the screen the focused card should be placed.
// This ensures it sits directly below the title/button overlay.
const FOCUS_Y_OFFSET = 180;

// Constraints for free drag mode
const DRAG_BOUNDS = { left: -1000, right: 1000, top: -800, bottom: 800 };

const Testimonials: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFreeMode, setIsFreeMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance
  const startAutoAdvance = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 4500); // slightly slower to give time to read
  }, []);

  useEffect(() => {
    if (!isFreeMode && !isPaused) startAutoAdvance();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isFreeMode, isPaused, startAutoAdvance]);

  const active = testimonials[activeIndex];

  const handleCardClick = (index: number) => {
    if (isFreeMode) {
      setActiveIndex(index);
      setIsFreeMode(false);
      setIsPaused(false);
    } else {
      setActiveIndex(index);
      setIsPaused(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      // Pause for a few seconds before resuming autoplay
      setTimeout(() => setIsPaused(false), 6000);
    }
  };

  const handleReadAll = () => {
    setIsFreeMode(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleBackToAuto = () => {
    setIsFreeMode(false);
    setIsPaused(false);
  };

  return (
    <section
      id="testimonials"
      className="relative bg-background"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {/* ── Title & CTA (Always at top, centered) ── */}
      <div className="absolute inset-x-0 top-0 z-30 flex flex-col items-center pt-24 pointer-events-none">
        <BlurFade delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold text-foreground leading-tight mb-4 text-center tracking-tight">
            Loved by thousands
            <br />
            of happy customers
          </h2>
        </BlurFade>
        <BlurFade delay={0.25}>
          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto text-center mb-8">
            Hear from our community of investors, advisors, and creators who
            trust us to power their portfolios.
          </p>
        </BlurFade>

        <BlurFade delay={0.35}>
          <div className="pointer-events-auto">
            <AnimatePresence mode="wait">
              {!isFreeMode ? (
                <motion.button
                  key="read-all"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onClick={handleReadAll}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[15px] font-medium transition-colors shadow-xl shadow-blue-600/20"
                >
                  Read all reviews
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </motion.button>
              ) : (
                <motion.button
                  key="back-auto"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onClick={handleBackToAuto}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white text-[15px] font-medium transition-colors backdrop-blur-md"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11 17l-5-5m0 0l5-5m-5 5h12"
                    />
                  </svg>
                  Back to autoplay
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </BlurFade>
      </div>

      {/* ── Outer Fades (Edges blur out) ── */}
      <div
        className="absolute inset-x-0 top-0 z-20 pointer-events-none"
        style={{
          height: "35vh",
          background:
            "linear-gradient(to bottom, hsl(var(--background)) 0%, hsl(var(--background)/0.8) 40%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 z-20 pointer-events-none"
        style={{
          height: "20vh",
          background:
            "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-y-0 left-0 z-20 pointer-events-none"
        style={{
          width: "15vw",
          background:
            "linear-gradient(to right, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 z-20 pointer-events-none"
        style={{
          width: "15vw",
          background:
            "linear-gradient(to left, hsl(var(--background)) 0%, transparent 100%)",
        }}
      />

      {/* ── 2D Canvas Origin (Positioned exactly at screen center) ── */}
      {/* We use a 0x0 div centered in the screen. Everything inside translates relative to this perfectly. */}
      {/* Using dragging on a wrapper for free mode, and transform for autoplay. */}
      <div className="absolute left-1/2 top-1/2 w-0 h-0 z-10">
        {!isFreeMode ? (
          <motion.div
            className="absolute inset-0"
            // We want the active card to be at the center horizontally (x=0) 
            // and shifted down by FOCUS_Y_OFFSET vertically.
            animate={{
              x: -active.x,
              y: -active.y + FOCUS_Y_OFFSET,
            }}
            transition={{
              duration: 1.2,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          >
            {testimonials.map((t, i) => (
              <ReviewCard
                key={i}
                t={t}
                index={i}
                isFocused={activeIndex === i}
                isFreeMode={false}
                onCardClick={() => handleCardClick(i)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            drag
            dragConstraints={DRAG_BOUNDS}
            dragElastic={0.15}
            dragTransition={{ bounceStiffness: 200, bounceDamping: 25 }}
            // Start the drag position near the active card's location so there isn't a jarring jump
            initial={{ x: -active.x, y: -active.y + FOCUS_Y_OFFSET }}
          >
            {/* Huge invisible hit area to capture drags on the empty canvas space */}
            <div className="absolute w-[6000px] h-[4000px] left-[-3000px] top-[-2000px] bg-transparent" />

            {testimonials.map((t, i) => (
              <ReviewCard
                key={i}
                t={t}
                index={i}
                isFocused={false}
                isFreeMode={true}
                onCardClick={() => handleCardClick(i)}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* ── Drag hint for free mode ── */}
      {isFreeMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 text-sm text-muted-foreground pointer-events-none"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 11L12 6L17 11M7 13L12 18L17 13"
            />
          </svg>
          Drag the canvas to explore reviews
        </motion.div>
      )}
    </section>
  );
};

export default Testimonials;
