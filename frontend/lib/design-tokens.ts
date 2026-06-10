/**
 * Yentellect Design System — Shared Tokens
 *
 * Single source of truth for colors, mode palettes, gradients,
 * spacing, borders, and animation values used across components.
 *
 * Usage:
 *   import { modes, tokens, getModeColor, getModeGlow } from "@/lib/design-tokens";
 */

import type { ThinkingMode } from "./api";

// ============================================================
// 🎨 THINKING MODE PALETTES
// ============================================================
export interface ModePalette {
  id: ThinkingMode;
  label: string;
  color: string;
  light: string;
  dark: string;
  surface: string;
  glow: string;
  text: string;
  gradient: string;
  order: number;
}

export const modes: ModePalette[] = [
  {
    id: "CONVERGENT",
    label: "Convergent",
    color: "#3B82F6",
    light: "#93C5FD",
    dark: "#1D4ED8",
    surface: "rgba(59, 130, 246, 0.1)",
    glow: "rgba(59, 130, 246, 0.25)",
    text: "#93C5FD",
    gradient: "from-blue-400 to-blue-600",
    order: 0,
  },
  {
    id: "DIVERGENT",
    label: "Divergent",
    color: "#8B5CF6",
    light: "#C4B5FD",
    dark: "#6D28D9",
    surface: "rgba(139, 92, 246, 0.1)",
    glow: "rgba(139, 92, 246, 0.25)",
    text: "#C4B5FD",
    gradient: "from-purple-400 to-purple-600",
    order: 1,
  },
  {
    id: "ANALOGICAL",
    label: "Analogical",
    color: "#F59E0B",
    light: "#FCD34D",
    dark: "#B45309",
    surface: "rgba(245, 158, 11, 0.1)",
    glow: "rgba(245, 158, 11, 0.25)",
    text: "#FCD34D",
    gradient: "from-amber-400 to-amber-600",
    order: 2,
  },
  {
    id: "METACOGNITIVE",
    label: "Metacognitive",
    color: "#10B981",
    light: "#6EE7B7",
    dark: "#047857",
    surface: "rgba(16, 185, 129, 0.1)",
    glow: "rgba(16, 185, 129, 0.25)",
    text: "#6EE7B7",
    gradient: "from-emerald-400 to-emerald-600",
    order: 3,
  },
  {
    id: "SYSTEMS",
    label: "Systems",
    color: "#EF4444",
    light: "#FCA5A5",
    dark: "#B91C1C",
    surface: "rgba(239, 68, 68, 0.1)",
    glow: "rgba(239, 68, 68, 0.25)",
    text: "#FCA5A5",
    gradient: "from-red-400 to-red-600",
    order: 4,
  },
  {
    id: "DMN",
    label: "DMN",
    color: "#6366F1",
    light: "#A5B4FC",
    dark: "#4338CA",
    surface: "rgba(99, 102, 241, 0.1)",
    glow: "rgba(99, 102, 241, 0.25)",
    text: "#A5B4FC",
    gradient: "from-indigo-400 to-indigo-600",
    order: 5,
  },
];

export function getModePalette(mode: ThinkingMode): ModePalette {
  return modes.find((m) => m.id === mode) ?? modes[0];
}

export function getModeColor(mode: ThinkingMode): string {
  return getModePalette(mode).color;
}

export function getModeGlow(mode: ThinkingMode): string {
  return getModePalette(mode).glow;
}

export function getModeGradient(mode: ThinkingMode): string {
  return getModePalette(mode).gradient;
}

// ============================================================
// 📐 SPACING TOKENS
// ============================================================
export const spacing = {
  px: "1px",
  0.5: "0.125rem",
  1: "0.25rem",
  1.5: "0.375rem",
  2: "0.5rem",
  2.5: "0.625rem",
  3: "0.75rem",
  3.5: "0.875rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
} as const;

// ============================================================
// 🟦 BORDER RADIUS TOKENS
// ============================================================
export const radius = {
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "10px",
  xl: "12px",
  "2xl": "16px",
  "3xl": "20px",
  full: "9999px",
} as const;

// ============================================================
// 🎬 ANIMATION TOKENS
// ============================================================
export const animation = {
  spring: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
    mass: 0.8,
  },
  springGentle: {
    type: "spring" as const,
    stiffness: 200,
    damping: 20,
    mass: 1,
  },
  springSnappy: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 0.5,
  },
  ease: {
    type: "tween" as const,
    ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
    duration: 0.3,
  },
  easeOutExpo: {
    type: "tween" as const,
    ease: [0.19, 1, 0.22, 1] as [number, number, number, number],
    duration: 0.4,
  },
  stagger: {
    staggerChildren: 0.05,
    delayChildren: 0.1,
  },
} as const;

// ============================================================
// 🌫️ GLASS CARD STYLES (as inline style objects)
// ============================================================
export const glassCard = {
  background: "rgba(255, 255, 255, 0.03)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "0.5px solid rgba(255, 255, 255, 0.1)",
  borderRadius: "12px",
  boxShadow:
    "0 0 0 0.5px rgba(255, 255, 255, 0.06), 0 4px 16px rgba(0, 0, 0, 0.2)",
} as React.CSSProperties;

// ============================================================
// 🎨 GRADIENT DEFINITIONS
// ============================================================
export const gradients = {
  brand: "linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)",
  brandHorizontal: "linear-gradient(90deg, #6366F1, #8B5CF6, #EC4899)",
  convergent: "linear-gradient(135deg, #3B82F6, #1D4ED8)",
  divergent: "linear-gradient(135deg, #8B5CF6, #6D28D9)",
  analogical: "linear-gradient(135deg, #F59E0B, #B45309)",
  metacognitive: "linear-gradient(135deg, #10B981, #047857)",
  systems: "linear-gradient(135deg, #EF4444, #B91C1C)",
  dmn: "linear-gradient(135deg, #6366F1, #4338CA)",
  surface: "linear-gradient(180deg, #0a0a0b, #141417)",
} as const;
