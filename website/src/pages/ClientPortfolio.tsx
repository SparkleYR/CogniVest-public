import React, { useEffect, useState, Component } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, MessageSquare, RefreshCw, AlertTriangle } from "lucide-react";
import { getClientTwin } from "../utils/cognivest-api";
import type { TwinOutput } from "../utils/cognivest-api";
import { cn } from "../lib/utils";
import { C } from "../utils/portfolio-helpers";
import { AdvisorDashboardDock } from "../components/AdvisorDashboardDock";

// Portfolio components
import { ClientHeader } from "../components/portfolio/ClientHeader";
import { FlagsBar } from "../components/portfolio/FlagsBar";
import { KPIStrip } from "../components/portfolio/KPIStrip";
import { HoldingsTable } from "../components/portfolio/HoldingsTable";
import { AllocationSection } from "../components/portfolio/AllocationSection";
import { RiskMetrics } from "../components/portfolio/RiskMetrics";
import { GoalProjections } from "../components/portfolio/GoalProjections";
import { RecommendedPortfolio } from "../components/portfolio/RecommendedPortfolio";
import { InsuranceTax } from "../components/portfolio/InsuranceTax";
import { TalkingPoints } from "../components/portfolio/TalkingPoints";
import { AdvisorChatPanel } from "../components/portfolio/AdvisorChatPanel";

// ── Error boundary (catches render crashes in portfolio sub-components) ──
class PortfolioErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { error: err.message };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          className="flex items-center gap-3 px-4 py-4 rounded-xl my-4 text-sm"
          style={{ background: C.red + "18", border: `1px solid ${C.red}44`, color: C.red }}
        >
          <AlertTriangle size={16} />
          <div>
            <div className="font-semibold mb-0.5">Component render error</div>
            <div className="text-xs opacity-80">{this.state.error}</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

type ActiveTab = "portfolio" | "goals" | "tax";

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "goals", label: "Goals" },
  { id: "tax", label: "Tax & Insurance" },
];

// ── Skeleton ──────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-24 rounded-2xl bg-muted/30" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-muted/30" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-muted/30" />
      <div className="h-48 rounded-2xl bg-muted/30" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
const ClientPortfolio: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  const advisorId = localStorage.getItem("cv_profile_id") ?? "";
  const advisorName = localStorage.getItem("cv_user_name") ?? "Advisor";

  const [twin, setTwin] = useState<TwinOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("portfolio");
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (!clientId || !advisorId) {
      setError("Missing client or advisor ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getClientTwin(advisorId, clientId)
      .then((data) => {
        setTwin(data);
        setLoading(false);
      })
      .catch((e: Error) => {
        setError(e.message);
        setLoading(false);
      });
  }, [advisorId, clientId]);

  const clientName = twin?.client_summary?.name;
  const criticalCount = (twin?.flags ?? []).filter((f) => f.severity === "critical").length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background watermark */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 translate-x-[15%] pointer-events-none select-none z-0"
        aria-hidden
      >
        <span className="text-[16vw] md:text-[18vw] font-extralight tracking-tighter text-foreground/[0.025] whitespace-nowrap">
          Portfolio
        </span>
      </div>

      {/* ── Framer Motion wrapper for the entire UI layout to slide/squeeze ── */}
      <motion.div
        animate={{ paddingRight: chatOpen ? "400px" : "0px" }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="flex flex-col flex-1 min-h-screen w-full"
      >
        {/* ── Sticky top bar ── */}
        <div
          className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl"
        >
        {/* Left: back + breadcrumb */}
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={() => navigate("/advisor/dashboard")}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm mr-1"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="hover:text-foreground cursor-pointer transition-colors"
              onClick={() => navigate("/advisor/dashboard")}
            >
              Dashboard
            </span>
            <span className="opacity-40">/</span>
            <span className="truncate max-w-[140px]">{clientName ?? "Client"}</span>
            <span className="opacity-40">/</span>
            <span className="text-foreground">Portfolio</span>
          </div>
        </div>

        {/* Center: tab bar */}
        <div className="hidden sm:flex items-center bg-muted/30 p-1 rounded-xl border border-border/50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: chat toggle + advisor name */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden md:block">{advisorName}</span>
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: chatOpen 
                ? C.accent 
                : `linear-gradient(135deg, ${C.accent}25, ${C.teal}15)`,
              color: chatOpen ? "#fff" : C.accent,
              border: `1px solid ${chatOpen ? C.accent : C.accent + "50"}`,
              boxShadow: chatOpen ? `0 4px 12px ${C.accent}40` : "none",
            }}
          >
            <MessageSquare size={14} />
            <span>Ask Twin</span>
            {criticalCount > 0 && (
              <span
                className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ml-1"
                style={{ 
                  background: chatOpen ? "#fff" : C.red, 
                  color: chatOpen ? C.accent : "#fff",
                }}
              >
                {criticalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile tabs (below header) */}
      <div className="sm:hidden flex items-center gap-1 px-4 py-2 bg-background border-b border-border/30 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground"
            )}
            style={
              activeTab === tab.id
                ? { background: C.accent + "22", color: C.accent, border: `1px solid ${C.accent}40` }
                : {}
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 w-full">
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-32 relative z-10">
          <div className="max-w-[1400px] mx-auto">

            {/* Loading */}
            {loading && <LoadingSkeleton />}

            {/* Error */}
            {error && (
              <div
                className="px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2"
                style={{ background: C.red + "18", border: `1px solid ${C.red}44`, color: C.red }}
              >
                <RefreshCw size={14} />
                {error}
              </div>
            )}

            {/* Content */}
            {!loading && twin && (
              <PortfolioErrorBoundary>
                <ClientHeader twin={twin} />
                <FlagsBar flags={twin.flags ?? []} />
                <KPIStrip
                  portfolio={twin.portfolio_snapshot ?? {} as never}
                  goalSummary={twin.goal_summary ?? {} as never}
                />

                {/* Tab content */}
                <AnimatePresence mode="wait">
                  {activeTab === "portfolio" && (
                    <motion.div
                      key="portfolio"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <PortfolioErrorBoundary>
                        <HoldingsTable holdings={twin.portfolio_snapshot?.holdings ?? []} />
                        <AllocationSection portfolio={twin.portfolio_snapshot ?? {} as never} />
                        <RiskMetrics portfolio={twin.portfolio_snapshot ?? {} as never} />
                        {twin.recommended_portfolio && <RecommendedPortfolio rec={twin.recommended_portfolio} />}
                      </PortfolioErrorBoundary>
                    </motion.div>
                  )}

                  {activeTab === "goals" && (
                    <motion.div
                      key="goals"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <PortfolioErrorBoundary>
                        <GoalProjections
                          goals={twin.goals ?? []}
                          goalSummary={twin.goal_summary ?? {} as never}
                        />
                      </PortfolioErrorBoundary>
                    </motion.div>
                  )}

                  {activeTab === "tax" && (
                    <motion.div
                      key="tax"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <PortfolioErrorBoundary>
                        <InsuranceTax insurance={twin.insurance ?? null} tax={twin.tax ?? null} />
                      </PortfolioErrorBoundary>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Talking points — always visible */}
                <TalkingPoints points={twin.advisor_talking_points ?? []} />
              </PortfolioErrorBoundary>
            )}
          </div>
        </main>
      </div>
      </motion.div>

      {/* ── Chat panel ── */}
      <AdvisorChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        advisorId={advisorId}
        clientId={clientId ?? ""}
        clientName={clientName}
      />

      {/* Dock */}
      <AdvisorDashboardDock />
    </div>
  );
};

export default ClientPortfolio;
