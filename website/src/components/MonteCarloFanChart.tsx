import React from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PercentileSeries } from "../utils/cognivest-api";
import { C } from "../utils/portfolio-helpers";

interface Props {
  percentileSeries: PercentileSeries;
}

function crFmt(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(0)}L`;
  return `₹${Math.round(v / 1000)}K`;
}

function FanTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const rP50 = payload.find((p) => p.dataKey === "rP50")?.value;
  const bP50 = payload.find((p) => p.dataKey === "bP50")?.value;
  return (
    <div
      style={{
        background: "#1c1c25",
        border: "1px solid #2a2a35",
        borderRadius: "10px",
        padding: "8px 12px",
        fontSize: "11px",
      }}
    >
      <div className="font-semibold mb-1" style={{ color: "#aaa" }}>{label}</div>
      {rP50 != null && (
        <div style={{ color: C.green }}>Rational median: {crFmt(rP50)}</div>
      )}
      {bP50 != null && (
        <div style={{ color: C.red }}>With behaviour: {crFmt(bP50)}</div>
      )}
    </div>
  );
}

export function MonteCarloFanChart({ percentileSeries: ps }: Props) {
  if (!ps?.years?.length) return null;

  const chartData = ps.years.map((yr, i) => ({
    year: yr === 0 ? "Now" : `Y${yr}`,
    rBase: ps.rational.p10[i],
    rBand: ps.rational.p90[i] - ps.rational.p10[i],
    rP50:  ps.rational.p50[i],
    bBase: ps.behavioural.p10[i],
    bBand: ps.behavioural.p90[i] - ps.behavioural.p10[i],
    bP50:  ps.behavioural.p50[i],
  }));

  return (
    <div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="year" tick={{ fontSize: 10, fill: C.text2 }} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={crFmt} tick={{ fontSize: 10, fill: C.text2 }} width={52} axisLine={false} tickLine={false} />
          {/* @ts-expect-error recharts overload */}
          <Tooltip content={<FanTooltip />} />

          {/* Rational P10–P90 band */}
          <Area type="monotone" dataKey="rBase" stackId="r" fill="transparent" stroke="none" legendType="none" />
          <Area type="monotone" dataKey="rBand" stackId="r"
            fill={C.green + "20"} stroke={C.green + "66"} strokeWidth={1} legendType="none" />

          {/* Behavioural P10–P90 band */}
          <Area type="monotone" dataKey="bBase" stackId="b" fill="transparent" stroke="none" legendType="none" />
          <Area type="monotone" dataKey="bBand" stackId="b"
            fill={C.red + "18"} stroke={C.red + "55"} strokeWidth={1} strokeDasharray="4 3" legendType="none" />

          {/* Median lines */}
          <Line type="monotone" dataKey="rP50" stroke={C.green} strokeWidth={2}
            dot={{ r: 2.5, fill: C.green, strokeWidth: 0 }} name="Rational" />
          <Line type="monotone" dataKey="bP50" stroke={C.red} strokeWidth={1.5} strokeDasharray="5 3"
            dot={{ r: 2.5, fill: C.red, strokeWidth: 0 }} name="Behavioural" />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-4 justify-center mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ background: C.green }} />
          <span className="text-[10px]" style={{ color: C.text2 }}>Rational</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 rounded-full" style={{ background: C.red }} />
          <span className="text-[10px]" style={{ color: C.text2 }}>With behaviour</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-sm opacity-40" style={{ background: C.green }} />
          <span className="text-[10px]" style={{ color: C.text2 }}>P10–P90 range</span>
        </div>
      </div>
    </div>
  );
}
