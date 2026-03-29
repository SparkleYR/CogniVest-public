import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Search, Users, AlertTriangle, TrendingUp, RefreshCw } from "lucide-react";
import { getAdvisorClients } from "../utils/cognivest-api";
import type { AdvisorClient } from "../utils/cognivest-api";
import { MagicCard } from "../components/magicui/magic-card";
import { AdvisorDashboardDock } from "../components/AdvisorDashboardDock";
import {
  C,
  formatINR,
  formatPct,
  avatarColour,
  getInitials,
  scoreColour,
} from "../utils/portfolio-helpers";

// ── Status badge ──────────────────────────────────────────────────
const STATUS_META: Record<AdvisorClient["status"], { label: string; color: string }> = {
  new:        { label: "New",        color: C.teal },
  active:     { label: "Active",     color: C.green },
  review_due: { label: "Review Due", color: C.amber },
  churned:    { label: "Churned",    color: C.text2 },
};

function StatusBadge({ status }: { status: AdvisorClient["status"] }) {
  const meta = STATUS_META[status] ?? STATUS_META.active;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: meta.color + "22", color: meta.color, border: `1px solid ${meta.color}44` }}
    >
      {meta.label}
    </span>
  );
}

// ── Score ring ────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number | null }) {
  const s = score ?? 0;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (s / 100) * circ;
  const col = scoreColour(s);
  return (
    <svg width={44} height={44} className="shrink-0">
      <circle cx={22} cy={22} r={r} fill="none" stroke="#2a2a35" strokeWidth={3.5} />
      <circle
        cx={22} cy={22} r={r} fill="none"
        stroke={col} strokeWidth={3.5}
        strokeDasharray={`${fill} ${circ - fill}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x={22} y={27} textAnchor="middle" fontSize={11} fontWeight="700" fill={col}>
        {score != null ? Math.round(score) : "—"}
      </text>
    </svg>
  );
}

// ── Client card ───────────────────────────────────────────────────
function ClientCard({ client, index, onClick }: { client: AdvisorClient; index: number; onClick: () => void }) {
  const bgCol = avatarColour(client.client_id);
  const initials = getInitials(client.client_name);
  const xirr = client.xirr_pct;
  const xirrColor = xirr != null ? (xirr >= 10 ? C.green : xirr >= 6 ? C.amber : C.red) : C.text2;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="cursor-pointer group"
      onClick={onClick}
    >
      <MagicCard
        gradientFrom={bgCol}
        gradientTo={C.accent}
        gradientOpacity={0.08}
        className="h-full transition-all duration-200 group-hover:shadow-lg group-hover:scale-[1.01]"
      >
        <div className="p-5 flex flex-col gap-4">

          {/* Header: avatar + name + status */}
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md"
              style={{ background: bgCol }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-foreground truncate">
                {client.client_name ?? "Unnamed"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {[
                  client.age ? `Age ${client.age}` : null,
                  client.occupation,
                  client.city,
                ].filter(Boolean).join(" · ") || "—"}
              </div>
            </div>
            <StatusBadge status={client.status} />
          </div>

          {/* Divider */}
          <div className="border-t border-border/30" />

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 items-center">
            {/* AUM */}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">AUM</div>
              <div className="text-sm font-semibold text-foreground">{formatINR(client.total_current_value)}</div>
            </div>

            {/* XIRR */}
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">XIRR</div>
              <div className="text-sm font-semibold" style={{ color: xirrColor }}>
                {xirr != null ? formatPct(xirr) : "—"}
              </div>
            </div>

            {/* Goal score ring */}
            <div className="flex justify-end">
              <ScoreRing score={client.goal_score} />
            </div>
          </div>

          {/* Footer: risk label + critical flags + engine badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {client.risk_label && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: C.accent + "22", color: C.accent, border: `1px solid ${C.accent}33` }}
              >
                {client.risk_label}
              </span>
            )}
            {client.critical_flags > 0 && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}33` }}
              >
                <AlertTriangle size={9} />
                {client.critical_flags} flag{client.critical_flags > 1 ? "s" : ""}
              </span>
            )}
            {client.engine_done && (
              <span className="ml-auto flex items-center gap-1 text-[9px] text-muted-foreground">
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

// ── Main page ─────────────────────────────────────────────────────
const AllClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const advisorId = localStorage.getItem("cv_profile_id") ?? "";
  const advisorName = localStorage.getItem("cv_user_name") ?? "Advisor";

  const [clients, setClients] = useState<AdvisorClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!advisorId) { setError("Not logged in as advisor"); setLoading(false); return; }
    getAdvisorClients(advisorId)
      .then((data) => { setClients(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, [advisorId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        (c.client_name ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q) ||
        (c.occupation ?? "").toLowerCase().includes(q) ||
        (c.risk_label ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const activeCount = clients.filter((c) => c.status === "active").length;
  const criticalCount = clients.reduce((s, c) => s + c.critical_flags, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">

      {/* Watermark */}
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 translate-x-[15%] pointer-events-none select-none z-0"
        aria-hidden
      >
        <span className="text-[16vw] md:text-[18vw] font-extralight tracking-tighter text-foreground/[0.025] whitespace-nowrap">
          Clients
        </span>
      </div>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-8 h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <Users size={16} style={{ color: C.accent }} />
          <span className="font-semibold text-sm">All Clients</span>
          {!loading && (
            <span className="text-xs text-muted-foreground ml-1">
              ({clients.length})
            </span>
          )}
        </div>

        {/* Search */}
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

      {/* ── Summary chips ── */}
      {!loading && clients.length > 0 && (
        <div className="flex items-center gap-3 px-4 md:px-8 py-3 border-b border-border/20">
          <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
            style={{ background: C.green + "18", color: C.green, border: `1px solid ${C.green}33` }}>
            <TrendingUp size={11} /> {activeCount} active
          </span>
          {criticalCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full"
              style={{ background: C.red + "18", color: C.red, border: `1px solid ${C.red}33` }}>
              <AlertTriangle size={11} /> {criticalCount} critical flags
            </span>
          )}
          {search && (
            <span className="text-xs text-muted-foreground">
              {filtered.length} of {clients.length} shown
            </span>
          )}
        </div>
      )}

      {/* ── Content ── */}
      <main className="flex-1 px-4 md:px-8 py-6 pb-32 relative z-10">

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-6 text-sm"
            style={{ background: C.red + "18", border: `1px solid ${C.red}44`, color: C.red }}
          >
            <RefreshCw size={14} /> {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted/30" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users size={40} className="text-muted-foreground/30 mb-4" />
            <div className="text-muted-foreground text-sm">No clients yet.</div>
            <div className="text-muted-foreground/60 text-xs mt-1">Clients will appear here once they complete onboarding.</div>
          </div>
        )}

        {/* No search results */}
        {!loading && !error && clients.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No clients match "{search}"
          </div>
        )}

        {/* Client cards grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((c, i) => (
              <ClientCard
                key={c.client_id}
                client={c}
                index={i}
                onClick={() => navigate(`/advisor/client/${c.client_id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Dock */}
      <AdvisorDashboardDock />
    </div>
  );
};

export default AllClientsPage;
