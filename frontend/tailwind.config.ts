import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: { base: "#080B11" },
        surface: { DEFAULT: "#0F1420" },
        border: { DEFAULT: "#1E2535", hover: "#2E3A55" },
        accent: { DEFAULT: "#6C63FF", secondary: "#00E5FF" },
        text: { primary: "#F0F4FF", muted: "#5A6480" },
        success: "#00FFB2",
        convergent: {
          DEFAULT: "#3B82F6",
          surface: "rgba(59, 130, 246, 0.1)",
          glow: "rgba(59, 130, 246, 0.25)",
          text: "#93C5FD",
        },
        divergent: {
          DEFAULT: "#8B5CF6",
          surface: "rgba(139, 92, 246, 0.1)",
          glow: "rgba(139, 92, 246, 0.25)",
          text: "#C4B5FD",
        },
        analogical: {
          DEFAULT: "#F59E0B",
          surface: "rgba(245, 158, 11, 0.1)",
          glow: "rgba(245, 158, 11, 0.25)",
          text: "#FCD34D",
        },
        metacognitive: {
          DEFAULT: "#10B981",
          surface: "rgba(16, 185, 129, 0.1)",
          glow: "rgba(16, 185, 129, 0.25)",
          text: "#6EE7B7",
        },
        systems: {
          DEFAULT: "#EF4444",
          surface: "rgba(239, 68, 68, 0.1)",
          glow: "rgba(239, 68, 68, 0.25)",
          text: "#FCA5A5",
        },
        dmn: {
          DEFAULT: "#6366F1",
          surface: "rgba(99, 102, 241, 0.1)",
          glow: "rgba(99, 102, 241, 0.25)",
          text: "#A5B4FC",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        space: ["var(--font-space-grotesk)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
        "6xl": ["3.75rem", { lineHeight: "1.1" }],
        "7xl": ["4.5rem", { lineHeight: "1.05" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
        full: "999px",
      },
      boxShadow: {
        card: "0 0 0 1px #1E2535, 0 8px 32px rgba(0,0,0,0.4)",
        "card-hover": "0 0 0 1px #2E3A55, 0 8px 32px rgba(0,0,0,0.4)",
        active: "0 0 20px rgba(108,99,255,0.15)",
        glass: "0 0 0 1px #1E2535, 0 8px 32px rgba(0,0,0,0.12)",
        glow: "0 0 20px rgba(108,99,255,0.15), 0 0 40px rgba(108,99,255,0.05)",
        button: "0 2px 8px rgba(0,0,0,0.3)",
      },
      animation: {
        "pulse-slow": "pulseSlow 6s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "scale-in": "scaleIn 0.2s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "spin-slow": "spin 4s linear infinite",
        "bounce-gentle": "bounceGentle 1s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "mode-shift": "modeShift 0.6s ease-out",
        "count-up": "countUp 1s ease-out",
        "skeleton": "skeleton 1.5s ease-in-out infinite",
        "node-pulse": "nodePulse 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.05)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(108,99,255,0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(108,99,255,0.25)" },
        },
        modeShift: {
          "0%": { transform: "scaleX(1)", opacity: "1" },
          "50%": { transform: "scaleX(0.8)", opacity: "0.5" },
          "100%": { transform: "scaleX(1)", opacity: "1" },
        },
        countUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        skeleton: {
          "0%": { opacity: "0.06" },
          "50%": { opacity: "0.12" },
          "100%": { opacity: "0.06" },
        },
        nodePulse: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring-light": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
      transitionDuration: {
        "250": "250ms",
        "400": "400ms",
        "600": "600ms",
        "1000": "1000ms",
      },
    },
  },
  plugins: [],
};
export default config;