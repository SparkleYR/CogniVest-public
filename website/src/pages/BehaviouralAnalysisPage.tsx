import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import {
  Brain,
  Search,
  X,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { getAdvisorClients, getClientTwin } from "../utils/cognivest-api";
import type { AdvisorClient, TwinOutput } from "../utils/cognivest-api";
import { MagicCard } from "../components/magicui/magic-card";
import { AdvisorDashboardDock } from "../components/AdvisorDashboardDock";
import { BehaviourBiasProfile } from "../components/behaviour/BehaviourBiasProfile";
import { BehaviourSimulation } from "../components/behaviour/BehaviourSimulation";
import { BehaviourSignals } from "../components/behaviour/BehaviourSignals";
import {
  C,
  formatINR,
  avatarColour,
  getInitials,
} from "../utils/portfolio-helpers";

// ── Scatter dot colours ───────────────────────────────────────────
function riskColour(c: AdvisorClient): string {
  if (c.critical_flags > 0) return C.red;
  if (c.panic_threshold_pct != null && Math.abs(c.panic_threshold_pct) < 10) return C.amber;
  return C.green;
}

// ── Client behaviour card ─────────────────────────────────────────
function BehaviourCard({
  client,
  index,
  selected,
  onClick,
}: {
  client: AdvisorClient;
  index: number;
  selected: boolean;
  onClick: () => void;
}) {
  const bg = avatarColour(client.client_id);
  const rc = riskColour(client);
  const panicAbs = client.panic_threshold_pct != null
    ? Math.abs(client.panic_threshold_pct)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <MagicCard
        gradientFrom={selected ? C.accent : bg}
        gradientTo={selected ? C.teal : C.accent}
        gradientOpacity={selected ? 0.18 : 0.07}
        className={`h-full transition-all duration-200 group-hover:shadow-lg group-hover:scale-[1.01] ${selected ? "ring-1 ring-accent/50" : ""}`}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow"
              style={{ background: bg }}
            >
              {getInitials(client.client_name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{client.client_name ?? "—"}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {[client.age ? `Age ${client.age}` : null, client.city].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            {/* Risk indicator */}
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: rc, boxShadow: `0 0 6px ${rc}60` }}
            />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div
              className="rounded-lg p-2.5"
              style={{ background: (panicAbs != null && panicAbs < 10 ? C.red : C.amber) + "15" }}
            >
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Panic trigger</div>
              <div
                className="text-sm font-bold font-mono"
                style={{ color: panicAbs != null && panicAbs < 10 ? C.red : C.amber }}
              >
                {panicAbs != null ? `−${panicAbs.toFixed(0)}%` : "—"}
              </div>
            </div>
            <div
              className="rounded-lg p-2.5"
              style={{ background: C.red + "12" }}
            >
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Behaviour cost</div>
              <div className="text-sm font-bold font-mono" style={{ color: C.red }}>
                {client.behaviour_cost_10yr != null ? formatINR(client.behaviour_cost_10yr) : "—"}
              </div>
            </div>
          </div>

          {/* Risk label + engine badge */}
          <div className="flex items-center justify-between mt-2.5">
            {client.risk_label ? (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: C.accent + "20", color: C.accent, border: `1px solid ${C.accent}30` }}
              >
                {client.risk_label}
              </span>
            ) : <span />}
            {client.engine_done && (
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Twin ready
              </span>
            )}
          </div>
        </div>
      </MagicCard>
    </motion.div>
  );
}

// ── Behaviour drawer ──────────────────────────────────────────────
function BehaviourDrawer({
  client,
  twin,
  loading,
  onClose,
}: {
  client: AdvisorClient | null;
  twin: TwinOutput | null;
  loading: boolean;
  onClose: () => void;
}) {
  const profile = twin?.behaviour_profile ?? null;
  const bg = client ? avatarColour(client.client_id) : C.accent;

  return (
    <motion.div
      initial={{ x: 500 }}
      animate={{ x: 0 }}
      exit={{ x: 500 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      className="fixed top-0 right-0 bottom-0 z-40 flex flex-col"
      style={{ width: 480, background: "hsl(var(--background))", borderLeft: "1px solid hsl(var(--border) / 0.4)" }}
    >
      {/* Drawer header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/40 flex-shrink-0">
        {client && (
          <div
            className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
            style={{ background: bg }}
          >
            {getInitials(client.client_name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{client?.client_name ?? "—"}</div>
          <div className="text-[10px] text-muted-foreground">Behaviour Profile</div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Drawer body */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {loading && (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted/30" />
            ))}
          </div>
        )}

        {!loading && !profile && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Clock size={32} className="text-muted-foreground/25" />
            <div className="text-sm text-muted-foreground">Awaiting engine data</div>
            <div className="text-xs text-muted-foreground/60 max-w-[220px]">
              Behavioural profile will appear once the digital twin engine has processed this client.
            </div>
          </div>
        )}

        {!loading && profile && (
          <>
            <BehaviourBiasProfile profile={profile} />
            <BehaviourSimulation
              sim={profile.simulation}
              cost={profile.behaviour_cost_10yr_inr}
            />
            <BehaviourSignals profile={profile} />
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Custom scatter dot ────────────────────────────────────────────
function ScatterDot(props: {
  cx?: number;
  cy?: number;
  payload?: AdvisorClient;
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;
  const col = riskColour(payload);
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill={col} fillOpacity={0.8} stroke={col} strokeWidth={1.5} strokeOpacity={0.4} />
    </g>
  );
}

// ── Main page ─────────────────────────────────────────────────────
const BehaviouralAnalysisPage: React.FC = () => {
  const advisorId = localStorage.getItem("cv_profile_id") ?? "";
  const advisorName = localStorage.getItem("cv_user_name") ?? "Advisor";

  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTwin, setSelectedTwin] = useState<TwinOutput | null>(null);
  const [twinLoading, setTwinLoading] = useState(false);

  useEffect(() => {
    if (!advisorId) { setError("Not logged in as advisor"); setLoading(false); return; }
    getAdvisorClients(advisorId)
      .then((data) => { setClients(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [advisorId]);

  const handleSelectClient = (clientId: string) => {
    if (selectedId === clientId) {
      setSelectedId(null);
      setSelectedTwin(null);
      return;
    }
    setSelectedId(clientId);
    setSelectedTwin(null);
    setTwinLoading(true);
    getClientTwin(advisorId, clientId)
      .then((t) => { setSelectedTwin(t); setTwinLoading(false); })
      .catch(() => { setTwinLoading(false); });
  };

  const selectedClient = clients.find((c) => c.client_id === selectedId) ?? null;

  // Scatter data: only clients with both metrics
  const scatterData = clients.filter(
    (c) => c.panic_threshold_pct != null && c.behaviour_cost_10yr != null
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        (c.client_name ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.risk_label ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const drawerOpen = selectedId !== null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">

      {/* Watermark */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 translate-x-[15%] pointer-events-none select-none z-0"
        aria-hidden
      >
        <span className="text-[16vw] md:text-[18vw] font-extralight tracking-tighter text-foreground/[0.025] whitespace-nowrap">
          Behaviour
        </span>
      </div>

      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Brain size={16} style={{ color: C.accent }} />
          <span className="font-semibold text-sm">Behavioural Analysis</span>
          {!loading && (
            <span className="text-xs text-muted-foreground ml-1">({clients.length} clients)</span>
          )}
        </div>
        <div className="relative w-56 md:w-72">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-muted/40 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border/80"
          />
        </div>
        <span className="text-xs text-muted-foreground hidden md:block">{advisorName}</span>
      </div>

      {/* Main layout — squeeze when drawer open */}
      <motion.div
        animate={{ paddingRight: drawerOpen ? "480px" : "0px" }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="flex-1 flex flex-col"
      >
        <main className="flex-1 px-4 md:px-8 py-6 pb-32 relative z-10">

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm"
              style={{ background: C.red + "18", border: `1px solid ${C.red}44`, color: C.red }}>
              <RefreshCw size={14} /> {error}
            </div>
          )}

          {/* ── Behaviour Risk Matrix ── */}
          {!loading && scatterData.length > 0 && (
            <MagicCard gradientFrom={C.accent} gradientTo={C.red} gradientOpacity={0.08} className="mb-6">
              <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2 text-sm font-semibold">
                <Brain size={14} style={{ color: C.accent }} />
                Behaviour Risk Matrix
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  X = panic sensitivity · Y = 10yr behaviour cost
                </span>
              </div>
              <div className="flex items-center gap-4 px-5 py-2">
                {[
                  { colour: C.green, label: "Low risk" },
                  { colour: C.amber, label: "Moderate" },
                  { colour: C.red, label: "High risk / flags" },
                ].map(({ colour, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ background: colour }} />
                    {label}
                  </div>
                ))}
              </div>
              <div className="h-64 px-4 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <XAxis
                      dataKey="x"
                      type="number"
                      name="Panic sensitivity (%)"
                      domain={[0, 35]}
                      tick={{ fontSize: 10, fill: C.text2 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      dataKey="y"
                      type="number"
                      name="Behaviour cost"
                      tick={{ fontSize: 10, fill: C.text2 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => {
                        if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(0)}Cr`;
                        if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(0)}L`;
                        return `₹${v}`;
                      }}
                    />
                    <ZAxis range={[60, 60]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3", stroke: C.border }}
                      content={({ payload }) => {
                        if (!payload?.length) return null;
                        const c = payload[0]?.payload as AdvisorClient & { x: number; y: number };
                        if (!c) return null;
                        return (
                          <div
                            className="text-xs px-3 py-2 rounded-xl"
                            style={{ background: "#1c1c25", border: "1px solid #2a2a35" }}
                          >
                            <div className="font-semibold mb-1">{c.client_name}</div>
                            <div className="text-muted-foreground">Panic at: −{Math.abs(c.panic_threshold_pct ?? 0).toFixed(0)}%</div>
                            <div className="text-muted-foreground">Cost: {c.behaviour_cost_10yr != null ? `₹${(c.behaviour_cost_10yr / 1_00_000).toFixed(1)}L` : "—"}</div>
                          </div>
                        );
                      }}
                    />
                    <Scatter
                      data={scatterData.map((c) => ({
                        ...c,
                        x: Math.abs(c.panic_threshold_pct ?? 0),
                        y: c.behaviour_cost_10yr ?? 0,
                      }))}
                      shape={<ScatterDot />}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </MagicCard>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-muted/30" />
              ))}
            </div>
          )}

          {/* Client cards */}
          {!loading && filtered.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                <AlertTriangle size={11} style={{ color: C.amber }} />
                Click a client to view their full behavioural deep-dive
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((c, i) => (
                  <BehaviourCard
                    key={c.client_id}
                    client={c}
                    index={i}
                    selected={selectedId === c.client_id}
                    onClick={() => handleSelectClient(c.client_id)}
                  />
                ))}
              </div>
            </>
          )}

          {!loading && !error && clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Brain size={40} className="text-muted-foreground/25 mb-4" />
              <div className="text-muted-foreground text-sm">No client data yet.</div>
            </div>
          )}
        </main>
      </motion.div>

      {/* Behaviour drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <BehaviourDrawer
            client={selectedClient}
            twin={selectedTwin}
            loading={twinLoading}
            onClose={() => { setSelectedId(null); setSelectedTwin(null); }}
          />
        )}
      </AnimatePresence>

      <AdvisorDashboardDock />
    </div>
  );
};

export default BehaviouralAnalysisPage;
