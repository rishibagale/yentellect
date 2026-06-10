/**
 * 🎨 Yentellect Design Tokens
 *
 * Single source of truth for brand colors, mode palettes,
 * typography scale, spacing, and animation constants.
 *
 * Used by both Tailwind config and runtime JS/TS.
 */

// ============================================================
// 🧠 THINKING MODE PALETTES
// ============================================================
export interface ModePalette {
  mode: "CONVERGENT" | "DIVERGENT" | "ANALOGICAL" | "METACOGNITIVE" | "SYSTEMS" | "DMN";
  name: string;
  tagline: string;
  color: string;
  text: string;
  surface: string;
  glow: string;
  label: string;
  gradient: string;
  emoji: string;
}

export const MODE_PALETTES: Record<string, ModePalette> = {
  CONVERGENT: {
    mode: "CONVERGENT",
    name: "Convergent",
    tagline: "Focus & precision",
    color: "#3B82F6",
    text: "#93C5FD",
    surface: "rgba(59, 130, 246, 0.1)",
    glow: "rgba(59, 130, 246, 0.25)",
    label: "Convergent",
    gradient: "from-blue-500 to-blue-600",
    emoji: "🎯",
  },
  DIVERGENT: {
    mode: "DIVERGENT",
    name: "Divergent",
    tagline: "Creative generation",
    color: "#8B5CF6",
    text: "#C4B5FD",
    surface: "rgba(139, 92, 246, 0.1)",
    glow: "rgba(139, 92, 246, 0.25)",
    label: "Divergent",
    gradient: "from-purple-500 to-purple-600",
    emoji: "💡",
  },
  ANALOGICAL: {
    mode: "ANALOGICAL",
    name: "Analogical",
    tagline: "Cross-domain mapping",
    color: "#F59E0B",
    text: "#FCD34D",
    surface: "rgba(245, 158, 11, 0.1)",
    glow: "rgba(245, 158, 11, 0.25)",
    label: "Analogical",
    gradient: "from-amber-500 to-amber-600",
    emoji: "🔗",
  },
  METACOGNITIVE: {
    mode: "METACOGNITIVE",
    name: "Metacognitive",
    tagline: "Think about thinking",
    color: "#10B981",
    text: "#6EE7B7",
    surface: "rgba(16, 185, 129, 0.1)",
    glow: "rgba(16, 185, 129, 0.25)",
    label: "Metacognitive",
    gradient: "from-emerald-500 to-emerald-600",
    emoji: "🪞",
  },
  SYSTEMS: {
    mode: "SYSTEMS",
    name: "Systems",
    tagline: "Causal chains",
    color: "#EF4444",
    text: "#FCA5A5",
    surface: "rgba(239, 68, 68, 0.1)",
    glow: "rgba(239, 68, 68, 0.25)",
    label: "Systems",
    gradient: "from-red-500 to-red-600",
    emoji: "⚙️",
  },
  DMN: {
    mode: "DMN",
    name: "DMN",
    tagline: "Open insight",
    color: "#6366F1",
    text: "#A5B4FC",
    surface: "rgba(99, 102, 241, 0.1)",
    glow: "rgba(99, 102, 241, 0.25)",
    label: "Default Mode Network",
    gradient: "from-indigo-500 to-indigo-600",
    emoji: "🌌",
  },
};

export const MODES = Object.values(MODE_PALETTES);

// ============================================================
// 🔤 TYPOGRAPHY SCALE
// ============================================================
export const TYPOGRAPHY = {
  display: {
    size: "3.75rem",
    lineHeight: 1.05,
    weight: 700,
    tracking: "-0.02em",
  },
  h1: {
    size: "2.25rem",
    lineHeight: 1.2,
    weight: 700,
    tracking: "-0.015em",
  },
  h2: {
    size: "1.5rem",
    lineHeight: 1.3,
    weight: 600,
    tracking: "-0.01em",
  },
  h3: {
    size: "1.25rem",
    lineHeight: 1.4,
    weight: 600,
    tracking: "-0.005em",
  },
  body: {
    size: "0.875rem",
    lineHeight: 1.6,
    weight: 400,
  },
  small: {
    size: "0.75rem",
    lineHeight: 1.5,
    weight: 400,
  },
  caption: {
    size: "0.625rem",
    lineHeight: 1.4,
    weight: 500,
    tracking: "0.05em",
  },
  mono: {
    size: "0.8125rem",
    lineHeight: 1.5,
    weight: 400,
  },
} as const;

// ============================================================
// 📐 SPACING
// ============================================================
export const SPACING = {
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
  32: "8rem",
  40: "10rem",
  48: "12rem",
  56: "14rem",
  64: "16rem",
} as const;

// ============================================================
// 🟦 BORDER RADIUS
// ============================================================
export const RADIUS = {
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
// 🎬 ANIMATION
// ============================================================
export const ANIMATION = {
  spring: { type: "spring" as const, stiffness: 300, damping: 25 },
  springGentle: { type: "spring" as const, stiffness: 200, damping: 20 },
  springBouncy: { type: "spring" as const, stiffness: 400, damping: 15 },
  ease: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
  easeOut: { duration: 0.3, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] },
  fast: { duration: 0.15 },
  slow: { duration: 0.4 },
  stagger: {
    container: { staggerChildren: 0.05, delayChildren: 0.1 },
    fast: { staggerChildren: 0.03, delayChildren: 0.05 },
  },
} as const;

// ============================================================
// 🧩 SHADOWS
// ============================================================
export const SHADOWS = {
  card: "0 0 0 0.5px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.2)",
  cardHover:
    "0 0 0 0.5px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3), 0 0 40px rgba(99,102,241,0.05)",
  glass: "0 0 0 0.5px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.12)",
  glow: "0 0 20px rgba(99,102,241,0.15), 0 0 40px rgba(99,102,241,0.05)",
  button: "0 2px 8px rgba(0,0,0,0.3)",
} as const;