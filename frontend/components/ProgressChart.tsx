"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ThinkingMode, getModeColor, getModeName } from "@/lib/api";

interface MetricEntry {
  metric_id: string;
  session_id: string;
  modes_activated: string;
  mode_scores: string;
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
        const scores = JSON.parse(m.mode_scores);
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
    "CONVERGENT",
    "DIVERGENT",
    "ANALOGICAL",
    "METACOGNITIVE",
    "SYSTEMS",
    "DMN",
  ];

  const visibleModes = modes.filter((mode) => {
    return data.filter((d) => d && (d as any)[mode] > 0).length >= 3;
  });

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-12 text-center">
        <p className="text-slate-500">
          Complete at least 3 sessions to see your progress chart.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Mode Performance Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="session"
            label={{ value: "Session #", position: "insideBottom", offset: -5 }}
            stroke="#94a3b8"
          />
          <YAxis
            label={{ value: "Score (%)", angle: -90, position: "insideLeft" }}
            stroke="#94a3b8"
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.95)",
              border: "none",
              borderRadius: "6px",
              color: "white",
            }}
          />
          <Legend />
          {visibleModes.map((mode) => (
            <Line
              key={mode}
              type="monotone"
              dataKey={mode}
              stroke={getModeColor(mode)}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={getModeName(mode)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}