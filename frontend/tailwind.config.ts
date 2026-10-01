import type { Config } from "tailwindcss";

/* ============================================================
   Yentellect workbench Tailwind theme (Stage 1 shell).
   Rule: every color is a CSS variable from globals.css, so the
   light theme later is a token swap. The old accent/mode/shadow
   tokens are gone with the deleted dashboard screens.
   fontFamily.mono + fontFamily.serif are the two voices:
   chrome (JetBrains Mono, 12px) and document body (Source Serif 4).
   ============================================================ */
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          0: "var(--bg-0)",
          1: "var(--bg-1)",
          2: "var(--bg-2)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          hover: "var(--surface-hover)",
        },
        border: {
          DEFAULT: "var(--border-default)",
        },
        accent: {
          DEFAULT: "var(--accent)",
        },
        text: {
          primary: "var(--text-primary)",
          muted: "var(--text-muted)",
        },
        danger: {
          DEFAULT: "var(--danger)",
        },
      },
      fontFamily: {
        sans: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
      },
      borderRadius: {
        xs: "4px",
      },
      boxShadow: {
        /* The command palette is the ONLY shadow in the workbench. */
        palette: "0 8px 32px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
