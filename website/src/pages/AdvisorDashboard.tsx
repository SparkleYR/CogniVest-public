import React, { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import { getAdvisorClients } from "../utils/cognivest-api";
import type { AdvisorClient } from "../utils/cognivest-api";
import { useNavigate } from "react-router-dom";
import { cn } from "../lib/utils";
import { AdvisorDashboardTopBar } from "../components/AdvisorDashboardTopBar";
import { AdvisorDashboardDock, type DockView } from "../components/AdvisorDashboardDock";
import { MagicCard } from "../components/magicui/magic-card";
import { NewsMarquee } from "../components/NewsMarquee";

// ── Colour tokens (for dynamic inline styles where Tailwind can't reach) ──
const C = {
  accent: "#7c6af7",
  accentLight: "#a89cf8",
  green: "#2dd98f",
  red: "#f25c5c",
  amber: "#f0a429",
  teal: "#2ec4b6",
  border: "#2a2a35",
  text2: "#8b8a96",
};

// ── Helpers ───────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLOURS = [
  "#7c6af7", "#2dd98f", "#f0a429", "#2ec4b6",
  "#f25c5c", "#a89cf8", "#6ad4dd", "#f5a623",
];

function avatarColour(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLOURS[Math.abs(hash) % AVATAR_COLOURS.length];
}

type HealthBucket = "healthy" | "elevated" | "at_risk" | "poor_start" | "no_data";

function getHealthBucket(c: AdvisorClient): HealthBucket {
  if (!c.engine_done) return "no_data";
  if (c.status === "new") return "poor_start";
  const score = c.goal_score ?? 0;
  const flags = c.critical_flags ?? 0;
  if (score >= 65 && flags === 0) return "healthy";
  if (flags >= 2 || score < 40) return "at_risk";
  return "elevated";
}

const HEALTH_COLOUR: Record<HealthBucket, string> = {
  healthy: C.green,
  elevated: C.amber,
  at_risk: C.red,
  poor_start: C.teal,
  no_data: C.border,
};

const HEALTH_LABEL: Record<HealthBucket, string> = {
  healthy: "Healthy",
  elevated: "Elevated",
  at_risk: "At Risk",
  poor_start: "Poor Start",
  no_data: "No Data",
};

function formatINR(val: number | null): string {
  if (val == null) return "—";
  if (val >= 1_00_00_000) return `₹${(val / 1_00_00_000).toFixed(1)}Cr`;
  if (val >= 1_00_000) return `₹${(val / 1_00_000).toFixed(1)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

function formatXIRR(val: number | null): string {
  if (val == null) return "—";
  return `${val.toFixed(1)}%`;
}

function timeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function formatDate(): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

// ── Sub-components ────────────────────────────────────────────────

function ScoreRing({ score }: { score: number | null }) {
  const s = score ?? 0;
  const radius = 14;
  const circ = 2 * Math.PI * radius;
  const dash = (s / 100) * circ;
  const colour = s >= 65 ? C.green : s >= 40 ? C.amber : C.red;
  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg width="36" height="36" className="-rotate-90">
        <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
        <circle
          cx="18" cy="18" r={radius} fill="none"
          stroke={colour} strokeWidth="3"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
        style={{ color: colour }}
      >
        {score != null ? score : "—"}
      </span>
    </div>
  );
}

function StatusTag({ client }: { client: AdvisorClient }) {
  let label = "On track";
  let colour = C.green;
  if (client.status === "new") { label = "New client"; colour = C.teal; }
  else if (client.status === "review_due") { label = "Review due"; colour = C.amber; }
  else if (client.status === "churned") { label = "Churned"; colour = C.text2; }
  else if (client.critical_flags > 0) { label = "Goal at risk"; colour = C.red; }
  return (
    <span
      className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        background: colour + "22",
        color: colour,
        border: `1px solid ${colour}44`,
      }}
    >
      {label}
    </span>
  );
}

function KPICard({
  label, value, sub, barColour, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  barColour: string;
  icon: React.ReactNode;
}) {
  return (
    <MagicCard
      gradientFrom={barColour}
      gradientTo={barColour + "66"}
      className="h-full"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative p-4 md:p-5 flex flex-col gap-2 h-full overflow-hidden rounded-2xl"
      >
        {/* Faded color accent background */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${barColour}22 0%, ${barColour}08 50%, transparent 80%)`,
          }}
        />

        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: barColour + "25",
              color: barColour,
            }}
          >
            {icon}
          </span>
        </div>
        <div className="text-2xl font-bold text-foreground tracking-tight relative z-10">
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground relative z-10">{sub}</div>}
      </motion.div>
    </MagicCard>
  );
}

// ── Main component ────────────────────────────────────────────────

const AdvisorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tooltipClient, setTooltipClient] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<DockView>("dashboard");

  const advisorId = localStorage.getItem("cv_profile_id");
  const advisorName = localStorage.getItem("cv_user_name") ?? "Advisor";

  const fetchClients = useCallback(async () => {
    if (!advisorId) { setError("Not logged in as advisor"); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await getAdvisorClients(advisorId);
      setClients(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [advisorId]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── Computed stats ──────────────────────────────────────────────
  const totalAUA = clients.reduce((s, c) => s + (c.total_current_value ?? 0), 0);
  const activeCount = clients.filter((c) => c.status === "active").length;
  const xirrList = clients.filter((c) => c.xirr_pct != null).map((c) => c.xirr_pct!);
  const avgXIRR = xirrList.length ? xirrList.reduce((a, b) => a + b, 0) / xirrList.length : null;
  const atRiskCount = clients.filter((c) => c.critical_flags > 0).length;
  const reviewDueCount = clients.filter((c) => c.status === "review_due").length;
  const newCount = clients.filter((c) => c.status === "new").length;
  const totalCriticalFlags = clients.reduce((s, c) => s + (c.critical_flags ?? 0), 0);

  const avgGoalScore = clients.length
    ? Math.round(clients.filter(c => c.goal_score != null).reduce((s, c) => s + c.goal_score!, 0) /
      (clients.filter(c => c.goal_score != null).length || 1))
    : 0;
  const onTrackCount = clients.filter((c) => (c.goal_score ?? 0) >= 65 && c.critical_flags === 0).length;
  const behaviourCostAtRisk = clients
    .filter((c) => c.critical_flags > 0)
    .reduce((s, c) => s + (c.behaviour_cost_10yr ?? 0), 0);

  // ── Filtered client list ────────────────────────────────────────
  const filtered = clients.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.client_name ?? "").toLowerCase().includes(q) ||
      (c.occupation ?? "").toLowerCase().includes(q) ||
      (c.city ?? "").toLowerCase().includes(q)
    );
  });

  const alertClients = [...clients]
    .filter((c) => c.critical_flags > 0)
    .sort((a, b) => (b.critical_flags ?? 0) - (a.critical_flags ?? 0));

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">

      {/* Large watermark typography - background */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 translate-x-[15%] pointer-events-none select-none z-0"
        aria-hidden
      >
        <span className="text-[16vw] md:text-[18vw] font-extralight tracking-tighter text-foreground/[0.025] whitespace-nowrap">
          Dashboard
        </span>
      </div>

      {/* ── TopBar (new simplified version) ── */}
      <AdvisorDashboardTopBar
        advisorName={advisorName}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        criticalFlagsCount={totalCriticalFlags}
      />

      {/* ── Main scroll area (no sidebar) ── */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-32 relative z-10">
        <div className="max-w-[1600px] mx-auto">

          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6"
          >
            <p className="text-xs text-muted-foreground mb-1.5">
              {formatDate()}
            </p>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Good {timeOfDay()}, {advisorName.split(" ")[0]}
              </h1>
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: C.green, boxShadow: `0 0 0 3px ${C.green}44` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {clients.length} clients · {formatINR(totalAUA)} AUM
              {atRiskCount > 0 && ` · `}
              {atRiskCount > 0 && (
                <span style={{ color: C.red }} className="font-semibold">{atRiskCount} flags need attention</span>
              )}
            </p>
          </motion.div>

          {/* ── News Marquee ── */}
          <NewsMarquee className="mb-6" />

          {/* Loading / error */}
          {loading && (
            <div className="flex items-center gap-2.5 text-muted-foreground mb-6">
              <RefreshCw size={14} className="animate-spin" />
              <span className="text-sm">Loading client data…</span>
            </div>
          )}
          {error && (
            <div
              className="px-4 py-3 rounded-xl mb-6 text-sm"
              style={{
                background: C.red + "18",
                border: `1px solid ${C.red}44`,
                color: C.red,
              }}
            >
              {error}
            </div>
          )}

          {/* KPI strip */}
          {!loading && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
              <KPICard label="Total AUM" value={formatINR(totalAUA)} barColour={C.green}
                sub={`${clients.length} total clients`} icon={<TrendingUp size={15} />} />
              <KPICard label="Active Clients" value={String(activeCount)} barColour={C.accent}
                sub={`${newCount} new this quarter`} icon={<Users size={15} />} />
              <KPICard label="Avg Portfolio XIRR" value={formatXIRR(avgXIRR)} barColour={C.amber}
                sub="Across active portfolios" icon={<BarChart2 size={15} />} />
              <KPICard label="Clients at Risk" value={String(atRiskCount)} barColour={C.red}
                sub={`${totalCriticalFlags} total critical flags`} icon={<AlertTriangle size={15} />} />
            </div>
          )}

          {/* Main grid: table + heatmap */}
          {!loading && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4 md:gap-5 mb-5">

              {/* Client Table */}
              <MagicCard gradientFrom={C.accent} gradientTo={C.teal} gradientOpacity={0.1}>
                <div className="overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
                    <Users size={14} style={{ color: C.accent }} />
                    Clients
                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                      {filtered.length} shown
                    </span>
                  </div>

                  {/* Table header */}
                  <div className="grid gap-3 px-5 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30"
                    style={{ gridTemplateColumns: "2.5fr 1fr 44px 80px 80px" }}
                  >
                    <span>Client</span>
                    <span className="text-right">AUM</span>
                    <span className="text-center">Score</span>
                    <span className="text-right">XIRR</span>
                    <span>Status</span>
                  </div>

                  {filtered.length === 0 && (
                    <div className="py-8 px-5 text-center text-muted-foreground text-sm">
                      {clients.length === 0 ? "No clients yet." : "No results match your search."}
                    </div>
                  )}

                  {filtered.map((c, i) => (
                    <motion.div
                      key={c.client_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 + i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="grid items-center gap-3 px-5 py-3 border-b border-border/50 transition-colors"
                      style={{ gridTemplateColumns: "2.5fr 1fr 44px 80px 80px" }}
                    >
                      {/* Client info */}
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                          style={{ background: avatarColour(c.client_id) }}
                        >
                          {getInitials(c.client_name)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-semibold text-sm truncate">
                            {c.client_name ?? "—"}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {[c.age ? `Age ${c.age}` : null, c.occupation, c.city].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>

                      {/* AUM */}
                      <div className="text-right text-sm font-semibold">
                        {formatINR(c.total_current_value)}
                      </div>

                      {/* Score ring */}
                      <div className="flex justify-center">
                        <ScoreRing score={c.goal_score} />
                      </div>

                      {/* XIRR */}
                      <div
                        className="text-right text-sm font-semibold"
                        style={{
                          color: c.xirr_pct != null ? (c.xirr_pct >= 10 ? C.green : c.xirr_pct >= 6 ? C.amber : C.red) : C.text2,
                        }}
                      >
                        {formatXIRR(c.xirr_pct)}
                      </div>

                      {/* Status */}
                      <div>
                        <StatusTag client={c} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </MagicCard>

              {/* Heatmap */}
              <MagicCard gradientFrom={C.green} gradientTo={C.amber} gradientOpacity={0.1}>
                <div>
                  <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
                    <LayoutDashboard size={14} style={{ color: C.accent }} />
                    Client Health Heatmap
                  </div>
                  <div className="p-4 pt-8">
                    {clients.length === 0 ? (
                      <div className="text-muted-foreground text-sm text-center py-6">
                        No client data yet.
                      </div>
                    ) : (
                      <>
                        {/* Heatmap Grid - Plain colored squares */}
                        <div className="grid grid-cols-6 gap-1.5 mb-4 relative">
                          {clients.map((c) => {
                            const bucket = getHealthBucket(c);
                            const bg = HEALTH_COLOUR[bucket];
                            const isHovered = tooltipClient === c.client_id;
                            return (
                              <div
                                key={c.client_id}
                                onMouseEnter={() => setTooltipClient(c.client_id)}
                                onMouseLeave={() => setTooltipClient(null)}
                                className="relative aspect-square rounded-md cursor-pointer transition-all duration-200"
                                style={{
                                  background: bg,
                                  opacity: bucket === "no_data" ? 0.3 : 0.85,
                                  transform: isHovered ? "scale(1.15)" : "scale(1)",
                                  boxShadow: isHovered ? `0 4px 20px ${bg}80` : "none",
                                  zIndex: isHovered ? 50 : 1,
                                }}
                              >
                                {/* Hover Tooltip Card */}
                                {isHovered && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className="absolute bg-popover border border-border rounded-xl p-3 min-w-[180px] shadow-2xl pointer-events-none"
                                    style={{
                                      zIndex: 9999,
                                      left: '50%',
                                      transform: 'translateX(-50%) translateY(-100%)',
                                      top: '-12px',
                                    }}
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <div
                                        className="w-3 h-3 rounded-sm flex-shrink-0"
                                        style={{ background: bg }}
                                      />
                                      <span className="font-semibold text-sm text-foreground truncate">
                                        {c.client_name ?? "Unknown"}
                                      </span>
                                    </div>
                                    <div className="space-y-1.5 text-xs">
                                      <div className="flex justify-between gap-4">
                                        <span className="text-muted-foreground">Status</span>
                                        <span style={{ color: bg }} className="font-medium">{HEALTH_LABEL[bucket]}</span>
                                      </div>
                                      {c.total_current_value != null && (
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">AUM</span>
                                          <span className="text-foreground font-medium">{formatINR(c.total_current_value)}</span>
                                        </div>
                                      )}
                                      {c.goal_score != null && (
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">Goal Score</span>
                                          <span className="text-foreground font-medium">{c.goal_score}/100</span>
                                        </div>
                                      )}
                                      {c.xirr_pct != null && (
                                        <div className="flex justify-between gap-4">
                                          <span className="text-muted-foreground">XIRR</span>
                                          <span className="text-foreground font-medium">{formatXIRR(c.xirr_pct)}</span>
                                        </div>
                                      )}
                                    </div>
                                    {/* Tooltip arrow */}
                                    <div
                                      className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                                      style={{
                                        borderLeft: "6px solid transparent",
                                        borderRight: "6px solid transparent",
                                        borderTop: "6px solid hsl(var(--border))",
                                      }}
                                    />
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="border-t border-border/30 pt-3">
                          <div className="text-[11px] text-muted-foreground mb-2 font-semibold">
                            Health Status
                          </div>
                          <div className="flex flex-wrap gap-y-1.5 gap-x-3.5">
                            {(Object.keys(HEALTH_LABEL) as HealthBucket[]).map((b) => (
                              <div key={b} className="flex items-center gap-1.5">
                                <span
                                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                                  style={{ background: HEALTH_COLOUR[b] }}
                                />
                                <span className="text-[11px] text-muted-foreground">{HEALTH_LABEL[b]}</span>
                                <span className="text-[11px] text-foreground font-semibold">
                                  {clients.filter((c) => getHealthBucket(c) === b).length}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </MagicCard>
            </div>
          )}

          {/* Bottom grid: Critical Alerts + My Performance */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">

              {/* Critical Alerts */}
              <MagicCard gradientFrom={C.red} gradientTo={C.amber} gradientOpacity={0.1}>
                <div className="overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle size={14} style={{ color: C.red }} />
                    Critical Alerts
                    {atRiskCount > 0 && (
                      <span
                        className="ml-auto text-[11px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: C.red + "22", color: C.red }}
                      >
                        {atRiskCount} clients
                      </span>
                    )}
                  </div>
                  <div>
                    {alertClients.length === 0 ? (
                      <div className="py-6 px-5 text-muted-foreground text-sm text-center">
                        No critical flags — all clients look stable.
                      </div>
                    ) : (
                      alertClients.map((c, i) => (
                        <div
                          key={c.client_id}
                          className={cn(
                            "flex items-start gap-3 px-5 py-3",
                            i < alertClients.length - 1 && "border-b border-border/50"
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: c.critical_flags >= 3 ? C.red : C.amber }}
                          />
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-semibold mb-0.5">
                              {c.client_name ?? "Unknown"}
                              <span className="font-normal text-muted-foreground"> — {c.critical_flags} critical flag{c.critical_flags !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex gap-1.5 items-center flex-wrap">
                              {c.risk_label && (
                                <span
                                  className="text-[11px] px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: C.accent + "22",
                                    color: C.accentLight,
                                    border: `1px solid ${C.accent}33`,
                                  }}
                                >
                                  {c.risk_label}
                                </span>
                              )}
                              <StatusTag client={c} />
                              {c.twin_computed_at && (
                                <span className="text-[11px] text-muted-foreground">
                                  Updated {new Date(c.twin_computed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold" style={{ color: C.red }}>
                              {formatINR(c.total_current_value)}
                            </div>
                            {c.goal_score != null && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Score {c.goal_score}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </MagicCard>

              {/* My Performance */}
              <MagicCard gradientFrom={C.accent} gradientTo={C.green} gradientOpacity={0.1}>
                <div className="overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
                    <BarChart2 size={14} style={{ color: C.accent }} />
                    My Performance
                  </div>
                  <div className="py-1">
                    {[
                      {
                        label: "Avg Goal Score",
                        value: `${avgGoalScore} / 100`,
                        bar: avgGoalScore,
                        barColour: avgGoalScore >= 65 ? C.green : avgGoalScore >= 40 ? C.amber : C.red,
                      },
                      {
                        label: "Clients on Track",
                        value: `${onTrackCount} / ${clients.length}`,
                        bar: clients.length ? (onTrackCount / clients.length) * 100 : 0,
                        barColour: C.green,
                      },
                      {
                        label: "Clients at Risk",
                        value: `${atRiskCount} / ${clients.length}`,
                        bar: clients.length ? (atRiskCount / clients.length) * 100 : 0,
                        barColour: C.red,
                      },
                      {
                        label: "New Clients (Quarter)",
                        value: String(newCount),
                        bar: clients.length ? (newCount / clients.length) * 100 : 0,
                        barColour: C.teal,
                      },
                    ].map((row) => (
                      <div key={row.label} className="px-5 py-2.5 border-b border-border/50">
                        <div className="flex justify-between mb-1.5">
                          <span className="text-xs text-muted-foreground">{row.label}</span>
                          <span className="text-sm font-bold text-foreground">{row.value}</span>
                        </div>
                        <div className="h-1 rounded-full bg-border/50">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              background: row.barColour,
                              width: `${Math.min(100, row.bar)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Summary metrics */}
                    <div className="px-5 py-3.5 flex flex-wrap gap-y-2.5 gap-x-5">
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">Total AUM</div>
                        <div className="text-[15px] font-bold" style={{ color: C.green }}>{formatINR(totalAUA)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground mb-0.5">Avg XIRR</div>
                        <div className="text-[15px] font-bold" style={{ color: C.amber }}>{formatXIRR(avgXIRR)}</div>
                      </div>
                      {behaviourCostAtRisk > 0 && (
                        <div>
                          <div className="text-[11px] text-muted-foreground mb-0.5">Behaviour cost (at-risk)</div>
                          <div className="text-[15px] font-bold" style={{ color: C.red }}>{formatINR(behaviourCostAtRisk)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </MagicCard>

            </div>
          )}

        </div>
      </main>

      {/* ── Bottom Dock (macOS style) ── */}
      <AdvisorDashboardDock
        currentView={currentView}
        onViewChange={setCurrentView}
      />
    </div>
  );
};

export default AdvisorDashboard;
