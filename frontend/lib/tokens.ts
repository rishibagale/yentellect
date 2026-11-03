/**
 * 🎨 Research Workbench Design Tokens
 *
 * Two kinds of token live here:
 *
 * 1. CHROME (colors.bg/surface/border/accent/text/muted, radius, shadows,
 *    fonts) — re-pointed at the workbench palette. These values MUST mirror
 *    the CSS variables in `app/globals.css` (hex, because WebGL/three.js
 *    cannot read CSS variables) and are kept in sync by hand:
 *      bg → --bg-0, surface → --bg-1, surfaceHover → --bg-2, border → --border,
 *      accent → --accent, text → --text, muted → --text-dim
 *
 * 2. DATA (colors.modes, MODE_PALETTES) — the six thinking-mode colours.
 *    These encode meaning and are NEVER restyled: mode colour only appears on
 *    data surfaces (session cards, fingerprint, graph), never in workbench
 *    chrome (spec rule).
 */

export const tokens = {
  colors: {
    bg: '#0e1116',            // == var(--bg-0)
    surface: '#141920',       // == var(--bg-1)
    surfaceHover: '#1b222b',  // == var(--bg-2)
    border: '#262f3b',        // == var(--border)
    borderHover: '#3a4655',
    accent: '#5eb0ef',        // == var(--accent) — the ONLY chrome accent
    accentGlow: 'rgba(94,176,239,0.15)',
    cyan: '#5eb0ef',
    text: '#d6dde6',          // == var(--text)
    muted: '#8391a3',         // == var(--text-dim)
    success: '#00FFB2',
    particle: 'rgba(94,176,239,0.6)',
    session: 'rgba(94,176,239,0.15)',
    fusion: 'linear-gradient(135deg, #5eb0ef, #8391a3)',
    modes: {                  // DATA — do not restyle
      CONVERGENT: '#6C63FF',
      DIVERGENT: '#A855F7',
      ANALOGICAL: '#F59E0B',
      METACOGNITIVE: '#10B981',
      SYSTEMS: '#EF4444',
      DMN: '#3B82F6',
    },
  },
  radius: {
    card: '4px',              // == var(--radius)
    button: '4px',
    chip: '999px',
  },
  shadows: {
    // The palette is the only drop shadow in the workbench; cards get a hairline.
    card: '0 0 0 1px #262f3b',
    cardHover: '0 0 0 1px #3a4655',
    accent: 'none',
    glow: (color: string) => `0 0 16px ${color}40`,
  },
  fonts: {
    display: 'var(--font-jetbrains-mono), monospace',
    body: 'var(--font-jetbrains-mono), monospace',
    mono: 'var(--font-jetbrains-mono), monospace',
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
