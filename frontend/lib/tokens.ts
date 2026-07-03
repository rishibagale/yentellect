/**
 * 🎨 Yentellect Design Tokens
 *
 * Single source of truth for brand colors, mode palettes,
 * typography scale, spacing, and animation constants.
 */

export const tokens = {
  colors: {
    bg: '#080B11',
    surface: '#0F1420',
    surfaceHover: '#131825',
    border: '#1E2535',
    borderHover: '#2E3A55',
    accent: '#6C63FF',
    accentGlow: 'rgba(108,99,255,0.15)',
    cyan: '#00E5FF',
    text: '#F0F4FF',
    muted: '#5A6480',
    success: '#00FFB2',
    modes: {
      CONVERGENT: '#6C63FF',
      DIVERGENT: '#A855F7',
      ANALOGICAL: '#F59E0B',
      METACOGNITIVE: '#10B981',
      SYSTEMS: '#EF4444',
      DMN: '#3B82F6',
    },
  },
  radius: {
    card: '16px',
    button: '10px',
    chip: '999px',
  },
  shadows: {
    card: '0 0 0 1px #1E2535, 0 8px 32px rgba(0,0,0,0.4)',
    cardHover: '0 0 0 1px #2E3A55, 0 8px 40px rgba(0,0,0,0.5)',
    accent: '0 0 20px rgba(108,99,255,0.15)',
    glow: (color: string) => `0 0 16px ${color}40`,
  },
  fonts: {
    display: "'Space Grotesk', sans-serif",
    body: "'Inter', sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
};

export const MODE_DESCRIPTIONS: Record<string, string> = {
  CONVERGENT: "Convergent — You drive toward precise, logical conclusions.",
  DIVERGENT: "Divergent — You generate ideas across wide possibility spaces.",
  ANALOGICAL: "Analogical — You think through patterns and comparisons.",
  METACOGNITIVE: "Metacognitive — You think about how you think.",
  SYSTEMS: "Systems — You map interdependencies and feedback loops.",
  DMN: "Default Mode — You synthesize through reflection and mind-wandering.",
};

export const SOCRATIC_QUESTIONS: Record<string, string> = {
  CONVERGENT: "What's the single most important constraint in the problem you're working on right now?",
  DIVERGENT: "What's something you believe that most people in your field would disagree with?",
  ANALOGICAL: "What does your current problem remind you of from a completely different domain?",
  METACOGNITIVE: "What assumption am I making that might not hold?",
  SYSTEMS: "What's the weakest link in this system?",
  DMN: "What memory or experience is shaping how I see this right now?",
};

export const MODE_PALETTES: Record<string, { mode: string; name: string; tagline: string; color: string; text: string; surface: string; glow: string; label: string; gradient: string; emoji: string }> = {
  CONVERGENT: {
    mode: "CONVERGENT", name: "Convergent", tagline: "Focus & precision",
    color: "#6C63FF", text: "#93C5FD", surface: "rgba(108,99,255,0.1)", glow: "rgba(108,99,255,0.25)", label: "Convergent", gradient: "from-[#6C63FF] to-[#6C63FF]", emoji: "🎯",
  },
  DIVERGENT: {
    mode: "DIVERGENT", name: "Divergent", tagline: "Creative generation",
    color: "#A855F7", text: "#C4B5FD", surface: "rgba(168,85,247,0.1)", glow: "rgba(168,85,247,0.25)", label: "Divergent", gradient: "from-[#A855F7] to-[#A855F7]", emoji: "💡",
  },
  ANALOGICAL: {
    mode: "ANALOGICAL", name: "Analogical", tagline: "Cross-domain mapping",
    color: "#F59E0B", text: "#FCD34D", surface: "rgba(245,158,11,0.1)", glow: "rgba(245,158,11,0.25)", label: "Analogical", gradient: "from-[#F59E0B] to-[#F59E0B]", emoji: "🔗",
  },
  METACOGNITIVE: {
    mode: "METACOGNITIVE", name: "Metacognitive", tagline: "Think about thinking",
    color: "#10B981", text: "#6EE7B7", surface: "rgba(16,185,129,0.1)", glow: "rgba(16,185,129,0.25)", label: "Metacognitive", gradient: "from-[#10B981] to-[#10B981]", emoji: "🪞",
  },
  SYSTEMS: {
    mode: "SYSTEMS", name: "Systems", tagline: "Causal chains",
    color: "#EF4444", text: "#FCA5A5", surface: "rgba(239,68,68,0.1)", glow: "rgba(239,68,68,0.25)", label: "Systems", gradient: "from-[#EF4444] to-[#EF4444]", emoji: "⚙️",
  },
  DMN: {
    mode: "DMN", name: "Default Mode Network", tagline: "Open insight",
    color: "#3B82F6", text: "#A5B4FC", surface: "rgba(59,130,246,0.1)", glow: "rgba(59,130,246,0.25)", label: "Default Mode Network", gradient: "from-[#3B82F6] to-[#3B82F6]", emoji: "🌌",
  },
};

export const MODES = Object.values(MODE_PALETTES);

export const ANIMATION = {
  spring: { type: "spring", stiffness: 300, damping: 25 },
  springGentle: { type: "spring", stiffness: 200, damping: 20 },
  ease: { duration: 0.25, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] },
  easeOut: { duration: 0.3, ease: [0.19, 1, 0.22, 1] as [number, number, number, number] },
  fast: { duration: 0.15 },
  slow: { duration: 0.4 },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const cardStagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
