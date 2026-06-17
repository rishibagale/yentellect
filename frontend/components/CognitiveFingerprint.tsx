"use client";

import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ModeScore } from "@/lib/api";

interface CognitiveFingerprintProps {
  scores: ModeScore[];
  size?: number;
}

export default function CognitiveFingerprint({ scores, size = 400 }: CognitiveFingerprintProps) {
  if (!scores.length) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-500">
        No data yet. Start a session to see your fingerprint.
      </div>
    );
  }

  const chartData = scores.map((s) => ({
    mode: s.label,
    score: s.score,
    color: s.color,
    full: 100,
  }));

  const CustomTick = (props: any) => {
    const { x, y, payload, index } = props;
    const color = chartData[index]?.color || "#94a3b8";
    return (
      <text x={x} y={y} textAnchor="middle" fontSize={11} fill={color} fontWeight={600}>
        {payload.value}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="glass-card-strong px-3 py-2 text-xs">
          <span style={{ color: d.color }} className="font-semibold">
            {d.mode}: {Math.round(d.score)}%
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full"
    >
      <ResponsiveContainer width="100%" height={size}>
        <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="mode" tick={<CustomTick />} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {chartData.map((entry, i) => (
            <Radar
              key={entry.mode}
              name={entry.mode}
              dataKey="score"
              stroke={entry.color}
              fill={entry.color}
              fillOpacity={0.15 + (scores.length - i) * 0.03}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={800}
              animationBegin={i * 100}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}