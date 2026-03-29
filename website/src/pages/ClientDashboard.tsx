import React, { useEffect, useState, Component } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { getMe, getClientTwin } from "../utils/cognivest-api";
import type { UserProfile, TwinOutput } from "../utils/cognivest-api";
import { cn } from "../lib/utils";
import { C } from "../utils/portfolio-helpers";
import { ClientDock } from "../components/ClientDock";
import DeepOnboardingChat from "../components/DeepOnboardingChat";
import { AskCogniVestPanel } from "../components/portfolio/AskCogniVestPanel";

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

// ── Error boundary ─────────────────────────────────────────────────
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

// ── Tab config ─────────────────────────────────────────────────────
type ActiveTab = "portfolio" | "goals" | "tax";

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "goals", label: "Goals" },
  { id: "tax", label: "Tax & Insurance" },
];

// ── Loading skeleton ───────────────────────────────────────────────
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
const ClientDashboard: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [twin, setTwin] = useState<TwinOutput | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [twinLoading, setTwinLoading] = useState(false);
  const [twinError, setTwinError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("portfolio");

  useEffect(() => {
    getMe()
      .then((p) => {
        setProfile(p);
        if (p?.client?.engine_done && p.client.advisor_id && p.client.client_id) {
          setTwinLoading(true);
          getClientTwin(p.client.advisor_id, p.client.client_id)
            .then((t) => { setTwin(t); setTwinLoading(false); })
            .catch((e: Error) => { setTwinError(e.message); setTwinLoading(false); });
        }
        setPageLoading(false);
      })
      .catch(() => setPageLoading(false));
  }, []);

  // ── Loading state ──────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: C.accent, borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Onboarding gate ────────────────────────────────────────────
  // Show fullscreen chatbot if client hasn't completed onboarding
  if (profile?.client && !profile.client.engine_done) {
    return (
      <DeepOnboardingChat
        clientId={profile.client.client_id}
        onComplete={() => window.location.reload()}
      />
    );
  }

  const clientName = twin?.client_summary?.name ?? profile?.client?.client_name ?? "My Portfolio";

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

      {/* Squeeze wrapper — shrinks when chat panel opens */}
      <motion.div
        animate={{ paddingRight: chatOpen ? "400px" : "0px" }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="flex flex-col flex-1 min-h-screen w-full"
      >

        {/* ── Sticky top bar ── */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          {/* Left: logo + name */}
          <div className="flex items-center gap-3">
            <img
              src="/cognivest-logo-monochrome.svg"
              alt="CogniVest"
              className="h-5 w-5 dark:invert"
            />
            <span className="font-semibold text-sm truncate max-w-[140px]">{clientName}</span>
          </div>

          {/* Center: tab bar (desktop) */}
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

          {/* Right: Ask CogniVest button */}
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
            <span>Ask CogniVest</span>
          </button>
        </div>

        {/* Mobile tab bar */}
        <div className="sm:hidden flex items-center gap-1 px-4 py-2 bg-background border-b border-border/30 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0",
                activeTab === tab.id ? "text-foreground" : "text-muted-foreground"
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

        {/* ── Main content ── */}
        <div className="flex flex-1 w-full">
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-32 relative z-10">
            <div className="max-w-[1400px] mx-auto">

              {/* Loading twin */}
              {twinLoading && <LoadingSkeleton />}

              {/* Error */}
              {twinError && (
                <div
                  className="px-4 py-3 rounded-xl mb-6 text-sm flex items-center gap-2"
                  style={{ background: C.red + "18", border: `1px solid ${C.red}44`, color: C.red }}
                >
                  <AlertTriangle size={14} />
                  {twinError}
                </div>
              )}

              {/* No advisor_id yet — engine not assigned */}
              {!twinLoading && !twin && !twinError && profile?.client?.engine_done && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="text-muted-foreground text-sm mb-2">Your portfolio analysis is being prepared.</div>
                  <div className="text-xs text-muted-foreground/60">Check back soon — your advisor's AI engine is building your profile.</div>
                </div>
              )}

              {/* Dashboard content */}
              {!twinLoading && twin && (
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
                          {twin.recommended_portfolio && (
                            <RecommendedPortfolio rec={twin.recommended_portfolio} />
                          )}
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
                </PortfolioErrorBoundary>
              )}
            </div>
          </main>
        </div>
      </motion.div>

      {/* Ask CogniVest panel */}
      <AskCogniVestPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        clientId={profile?.client?.client_id ?? ""}
      />

      {/* Client dock */}
      <ClientDock onOpenChat={() => setChatOpen((v) => !v)} />
    </div>
  );
};

export default ClientDashboard;
