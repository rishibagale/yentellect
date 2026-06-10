import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ============================================================
      // 🎨 SEMANTIC COLOR SYSTEM
      // ============================================================
      colors: {
        surface: {
          DEFAULT: "#0a0a0b",
          50: "#1a1a1e",
          100: "#141417",
          200: "#111113",
          300: "#0e0e10",
          400: "#0c0c0d",
          500: "#0a0a0b",
          600: "#080809",
          700: "#060607",
          800: "#040405",
          900: "#020203",
        },
        convergent: {
          DEFAULT: "#3B82F6",
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          surface: "rgba(59, 130, 246, 0.1)",
          glow: "rgba(59, 130, 246, 0.25)",
          text: "#93C5FD",
        },
        divergent: {
          DEFAULT: "#8B5CF6",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#4C1D95",
          surface: "rgba(139, 92, 246, 0.1)",
          glow: "rgba(139, 92, 246, 0.25)",
          text: "#C4B5FD",
        },
        analogical: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          surface: "rgba(245, 158, 11, 0.1)",
          glow: "rgba(245, 158, 11, 0.25)",
          text: "#FCD34D",
        },
        metacognitive: {
          DEFAULT: "#10B981",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          surface: "rgba(16, 185, 129, 0.1)",
          glow: "rgba(16, 185, 129, 0.25)",
          text: "#6EE7B7",
        },
        systems: {
          DEFAULT: "#EF4444",
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          surface: "rgba(239, 68, 68, 0.1)",
          glow: "rgba(239, 68, 68, 0.25)",
          text: "#FCA5A5",
        },
        dmn: {
          DEFAULT: "#6366F1",
          50: "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          surface: "rgba(99, 102, 241, 0.1)",
          glow: "rgba(99, 102, 241, 0.25)",
          text: "#A5B4FC",
        },
      },

      // ============================================================
      // 🔠 TYPOGRAPHY
      // ============================================================
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }], // 10px
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14px
        base: ["1rem", { lineHeight: "1.5rem" }], // 16px
        lg: ["1.125rem", { lineHeight: "1.75rem" }], // 18px
        xl: ["1.25rem", { lineHeight: "1.75rem" }], // 20px
        "2xl": ["1.5rem", { lineHeight: "2rem" }], // 24px
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }], // 30px
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }], // 36px
        "5xl": ["3rem", { lineHeight: "1.1" }], // 48px
        "6xl": ["3.75rem", { lineHeight: "1.1" }], // 60px
        "7xl": ["4.5rem", { lineHeight: "1.05" }], // 72px
      },
      fontWeight: {
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },

      // ============================================================
      // 📐 SPACING / SIZING
      // ============================================================
      spacing: {
        "0.25": "0.0625rem", // 1px
        "0.5": "0.125rem",
        "1": "0.25rem",
        "1.5": "0.375rem",
        "2": "0.5rem",
        "2.5": "0.625rem",
        "3": "0.75rem",
        "3.5": "0.875rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "7": "1.75rem",
        "8": "2rem",
        "9": "2.25rem",
        "10": "2.5rem",
        "11": "2.75rem",
        "12": "3rem",
        "14": "3.5rem",
        "16": "4rem",
        "20": "5rem",
        "24": "6rem",
        "28": "7rem",
        "32": "8rem",
        "36": "9rem",
        "40": "10rem",
        "48": "12rem",
        "56": "14rem",
        "64": "16rem",
      },

      // ============================================================
      // 🟦 BORDER RADIUS
      // ============================================================
      borderRadius: {
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "24px",
      },

      // ============================================================
      // 🌫️ BACKDROP / SHADOWS
      // ============================================================
      boxShadow: {
        card: "0 0 0 0.5px rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.2)",
        "card-hover":
          "0 0 0 0.5px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3), 0 0 40px rgba(99,102,241,0.05)",
        glass: "0 0 0 0.5px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.12)",
        glow: "0 0 20px rgba(99,102,241,0.15), 0 0 40px rgba(99,102,241,0.05)",
        "glow-lg":
          "0 0 30px rgba(99,102,241,0.2), 0 0 60px rgba(99,102,241,0.1)",
        button: "0 2px 8px rgba(0,0,0,0.3)",
      },

      // ============================================================
      // 🎬 ANIMATIONS
      // ============================================================
      animation: {
        // Existing
        "pulse-slow": "pulseSlow 6s ease-in-out infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        // New premium
        "shimmer": "shimmer 2s linear infinite",
        "scale-in": "scaleIn 0.2s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "spin-slow": "spin 4s linear infinite",
        "bounce-gentle": "bounceGentle 1s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "mode-shift": "modeShift 0.6s ease-out",
        "count-up": "countUp 1s ease-out",
        "skeleton": "skeleton 1.5s ease-in-out infinite",
      },
      keyframes: {
        // Existing
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
        // New
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(99,102,241,0.1)" },
          "50%": { boxShadow: "0 0 40px rgba(99,102,241,0.25)" },
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
      },

      // ============================================================
      // 📦 TRANSITION TIMING
      // ============================================================
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