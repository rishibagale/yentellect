"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ThinkingMode, getModeColor, getModeName } from "@/lib/api";

interface MetricEntry {
  metric_id: string;
  session_id: string;
  modes_activated: string | string[];
  mode_scores: string | Record<string, number>;
  overall_score: number;
  created_at: string;
}

interface ProgressChartProps {
  metrics: MetricEntry[];
}

export default function ProgressChart({ metrics }: ProgressChartProps) {
  const data = metrics
    .slice()
    .reverse()
    .map((m, i) => {
      try {
        const scores = typeof m.mode_scores === "string" ? JSON.parse(m.mode_scores) : m.mode_scores;
        return {
          session: i + 1,
          CONVERGENT: (scores.CONVERGENT || 0) * 100,
          DIVERGENT: (scores.DIVERGENT || 0) * 100,
          ANALOGICAL: (scores.ANALOGICAL || 0) * 100,
          METACOGNITIVE: (scores.METACOGNITIVE || 0) * 100,
          SYSTEMS: (scores.SYSTEMS || 0) * 100,
          DMN: (scores.DMN || 0) * 100,
        };
      } catch {
        return null;
      }
    })
    .filter((d) => d !== null);

  const modes: ThinkingMode[] = [
    "CONVERGENT", "DIVERGENT", "ANALOGICAL", "METACOGNITIVE", "SYSTEMS", "DMN",
  ];
  // Show modes that have any data, even a single session
  const visibleModes = modes.filter((mode) =>
    data.some((d) => d && (d as any)[mode] > 0)
  );

  if (data.length === 0) {
    return (
      <div className="bg-[#0F1420] border border-[#1E2535] rounded-[16px] p-8 text-center shadow-card">
        <p className="text-[#5A6480] text-sm">Complete your first session to see progress.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0F1420] backdrop-blur-xl border border-[#1E2535] rounded-[16px] p-5 shadow-card">
      <h3 className="text-sm font-semibold mb-4 text-[#F0F4FF] font-space">Mode performance over time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="session" stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: "Session #", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} label={{ value: "Score (%)", angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 11 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#f1f5f9",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
          {visibleModes.map((mode) => (
            <Line
              key={mode}
              type="monotone"
              dataKey={mode}
              stroke={getModeColor(mode)}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name={getModeName(mode)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
