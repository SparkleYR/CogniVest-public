import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { MagicCard } from "./magicui/magic-card";
import { getMarketNews } from "../utils/cognivest-api";
import type { NewsItem } from "../utils/cognivest-api";
import { cn } from "../lib/utils";

// ── Colour tokens ─────────────────────────────────────────────────────────────
const C = {
  accent: "#7c6af7",
  green: "#2dd98f",
  amber: "#f0a429",
  teal: "#2ec4b6",
  text2: "#8b8a96",
};

const SOURCE_COLOURS: Record<NewsItem["color_key"], string> = {
  amber: C.amber,   // ET Markets
  green: C.green,   // Moneycontrol
  teal: C.teal,     // Business Standard
  accent: C.accent, // Livemint
};

const SOURCE_ABBREV: Record<string, string> = {
  "ET Markets": "ET Mkts",
  Moneycontrol: "MC",
  "Business Standard": "BS",
  Livemint: "Mint",
};

// ── Time-ago helper ───────────────────────────────────────────────────────────
function timeAgo(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

// ── Skeleton chip ─────────────────────────────────────────────────────────────
function SkeletonChip() {
  return (
    <span
      className="inline-flex items-center shrink-0 rounded-full animate-shimmer-news"
      style={{
        minWidth: "200px",
        height: "24px",
        background:
          "linear-gradient(90deg, #ffffff08 25%, #ffffff14 50%, #ffffff08 75%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}

// ── News chip ─────────────────────────────────────────────────────────────────
function NewsChip({ item }: { item: NewsItem }) {
  const dotColor = SOURCE_COLOURS[item.color_key] ?? C.text2;
  const abbrev = SOURCE_ABBREV[item.source] ?? item.source;

  return (
    <button
      type="button"
      onClick={() =>
        item.url && window.open(item.url, "_blank", "noopener,noreferrer")
      }
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full shrink-0 transition-colors duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
      style={{ maxWidth: "420px" }}
      title={item.summary || item.title}
    >
      {/* Dot + source label */}
      <span className="inline-flex items-center gap-1 shrink-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dotColor }}
        />
        <span
          className="text-[10px] font-semibold uppercase tracking-wider shrink-0"
          style={{ color: dotColor }}
        >
          {abbrev}
        </span>
      </span>

      {/* Headline */}
      <span
        className="text-xs truncate"
        style={{ color: "hsl(var(--foreground) / 0.8)", maxWidth: "290px" }}
      >
        {item.title}
      </span>

      {/* Time ago */}
      <span className="text-[10px] shrink-0" style={{ color: C.text2 }}>
        {timeAgo(item.published_at)}
      </span>
    </button>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────────
function Dot() {
  return (
    <span
      className="shrink-0 select-none px-1.5"
      style={{ color: C.text2, opacity: 0.5 }}
      aria-hidden
    >
      ·
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface NewsMarqueeProps {
  className?: string;
}

export function NewsMarquee({ className }: NewsMarqueeProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    async function loadNews() {
      const data = await getMarketNews();
      setItems(data);
      setLoading(false);
    }

    // Guard against React 18 Strict Mode double-invoke
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadNews();
    }

    const interval = setInterval(async () => {
      const data = await getMarketNews();
      if (data.length > 0) setItems(data);
    }, 900_000); // re-fetch every 15 minutes

    return () => clearInterval(interval);
  }, []);

  // Hide silently if fetch returned nothing
  if (!loading && items.length === 0) return null;

  // Duplicate for seamless CSS marquee loop
  const loopItems = [...items, ...items];

  // Scale duration with item count so chips don't fly past on short lists
  const animDuration = Math.max(80, items.length * 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      <MagicCard
        gradientFrom="#7c6af7"
        gradientTo="#2ec4b6"
        className="overflow-hidden"
      >
        <div className="flex items-center h-10">
          {/* Fixed left label */}
          <div
            className="flex items-center gap-2 px-4 shrink-0 h-full border-r"
            style={{ borderColor: "rgba(42,42,53,0.6)" }}
          >
            <span style={{ fontSize: "13px", lineHeight: 1 }} aria-hidden>
              📰
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap hidden sm:block"
              style={{ color: C.accent }}
            >
              Market News
            </span>
          </div>

          {/* Scrolling area with gradient fade on both edges */}
          <div
            className="flex-1 overflow-hidden relative h-full"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 5%, black 95%, transparent)",
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {loading ? (
              <div className="flex items-center h-full gap-3 px-4">
                <SkeletonChip />
                <Dot />
                <SkeletonChip />
                <Dot />
                <SkeletonChip />
              </div>
            ) : (
              <div
                className="flex items-center h-full"
                style={{
                  width: "max-content",
                  animation: `marquee-news ${animDuration}s linear infinite`,
                  animationPlayState: isPaused ? "paused" : "running",
                }}
              >
                {loopItems.map((item, idx) => (
                  <React.Fragment key={`${item.url || item.title}-${idx}`}>
                    {idx > 0 && <Dot />}
                    <NewsChip item={item} />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </MagicCard>
    </motion.div>
  );
}
