/**
 * Yentellect workbench — command registry (Stages 1 + 4, C4).
 *
 * One registry feeds the palette, the keyboard shortcuts, and the
 * quick actions, so surfaces cannot drift out of sync.
 *
 * Reformed:
 * - Rich categories (Research & Data, Document & Writing, Cognitive Lenses, Navigation & Views, Settings & Tools, Help & Shortcuts)
 * - OS-aware keyboard shortcuts (Ctrl+ on Windows/Linux, ⌘ on macOS)
 * - Deep keyword search & aliases (e.g. "pdf", "arxiv", "latex", "math", "split", "export")
 * - Direct execution hooks for editor mode switches and demo loaders
 */
"use client";

import type { ThinkingMode } from "@/lib/modes";
import type { Activity } from "./storage";

export function isMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
}

export function getModKeyLabel(): string {
  return isMacOS() ? "⌘" : "Ctrl";
}

export type CommandCategory =
  | "Research & Data"
  | "Document & Writing"
  | "Cognitive Lenses"
  | "Navigation & Views"
  | "Settings & Tools"
  | "Help & Shortcuts";

export interface WorkbenchCommand {
  id: string;
  title: string;
  category: CommandCategory;
  hint?: string;
  icon?: string;
  keywords?: string[];
  /** Stage gate: false + reason renders the entry disabled, never silently dead. */
  enabled: boolean;
  disabledReason?: string;
  run: () => void;
}

export interface CommandContext {
  toggleExplorer: () => void;
  toggleLens: () => void;
  openPaletteOnly: () => void;
  betaModes: boolean;
  setBetaModes: (on: boolean) => void;
  activeLens: ThinkingMode;
  setActiveLens: (lens: ThinkingMode) => void;
  navigate: (path: string) => void;
  openActivity: (a: Activity) => void;
  openImport: () => void;
  createDoc: (kind: "concept" | "note", title?: string) => void;
  loadDemo?: () => void;
  showShortcuts?: () => void;
}

/**
 * Build the full command registry for the workbench.
 */
export function buildCommands(ctx: CommandContext): WorkbenchCommand[] {
  const mod = getModKeyLabel();

  const cmd = (
    id: string,
    title: string,
    category: CommandCategory,
    rest: Partial<WorkbenchCommand> & { run: () => void }
  ): WorkbenchCommand => ({
    id,
    title,
    category,
    enabled: true,
    ...rest,
  });

  const triggerCustom = (action: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("workbench:command", { detail: { action } })
      );
    }
  };

  return [
    // ── Research & Data ───────────────────────────────────────
    cmd("import-paper", "Import research or dataset", "Research & Data", {
      icon: "📥",
      hint: "arXiv, DOI, PDF, Web",
      keywords: [
        "arxiv",
        "doi",
        "biorxiv",
        "pubmed",
        "pdf",
        "web",
        "csv",
        "paper",
        "dataset",
        "upload",
        "fetch",
        "article",
        "download",
        "journal",
      ],
      run: () => ctx.openImport(),
    }),
    cmd("load-demo", "Load Navier-Stokes demo paper", "Research & Data", {
      icon: "◈",
      hint: "Fluid equations & probes",
      keywords: [
        "demo",
        "sample",
        "example",
        "fluid",
        "navier",
        "stokes",
        "equations",
        "physics",
        "mathematics",
      ],
      run: () => {
        if (ctx.loadDemo) ctx.loadDemo();
        else triggerCustom("load-demo");
      },
    }),

    // ── Document & Writing ────────────────────────────────────
    cmd("new-concept", "New concept draft", "Document & Writing", {
      icon: "✦",
      hint: "Theory or core model",
      keywords: ["new", "concept", "theory", "document", "draft", "hypothesis", "model"],
      run: () => ctx.createDoc("concept"),
    }),
    cmd("new-note", "New research note", "Document & Writing", {
      icon: "✎",
      hint: "Quick note / scratchpad",
      keywords: ["new", "note", "scratchpad", "idea", "write", "memo", "thoughts"],
      run: () => ctx.createDoc("note"),
    }),
    cmd("mode-read", "View mode: Academic reading (KaTeX & Markdown)", "Document & Writing", {
      icon: "📖",
      hint: "Formatted math paper",
      keywords: ["read", "reading", "preview", "katex", "math", "clean", "paper", "view", "render"],
      run: () => triggerCustom("mode-read"),
    }),
    cmd("mode-split", "View mode: Split editor & live preview", "Document & Writing", {
      icon: "◫",
      hint: "Side-by-side editing",
      keywords: ["split", "side by side", "editor", "live preview", "two pane", "both"],
      run: () => triggerCustom("mode-split"),
    }),
    cmd("mode-edit", "View mode: Focused markdown editor", "Document & Writing", {
      icon: "✏️",
      hint: "CodeMirror source",
      keywords: ["edit", "editor", "codemirror", "write", "source", "raw", "text"],
      run: () => triggerCustom("mode-edit"),
    }),
    cmd("insert-latex", "Insert LaTeX equation block", "Document & Writing", {
      icon: "∑",
      hint: "$$...$$ formula",
      keywords: [
        "latex",
        "math",
        "equation",
        "formula",
        "katex",
        "insert",
        "symbol",
        "integral",
        "derivative",
        "expression",
      ],
      run: () => triggerCustom("insert-latex"),
    }),
    cmd("export-doc", "Copy active document markdown to clipboard", "Document & Writing", {
      icon: "📋",
      hint: "Copy text",
      keywords: ["export", "copy", "clipboard", "download", "save", "markdown", "share"],
      run: () => triggerCustom("export-doc"),
    }),

    // ── Cognitive Lenses ──────────────────────────────────────
    cmd("run-analogical", "Activate Analogical Lens", "Cognitive Lenses", {
      icon: "🔀",
      hint: `${mod}+1`,
      keywords: ["lens", "analogical", "analogy", "metaphor", "cross domain", "isomorphism", "ai"],
      run: () => ctx.setActiveLens("ANALOGICAL"),
    }),
    cmd("run-systems", "Activate Systems Lens", "Cognitive Lenses", {
      icon: "🔄",
      hint: `${mod}+2`,
      keywords: ["lens", "systems", "feedback", "causal", "loops", "dynamics", "stocks", "ai"],
      run: () => ctx.setActiveLens("SYSTEMS"),
    }),
    cmd("run-convergent", "Activate Convergent Lens", "Cognitive Lenses", {
      icon: "🎯",
      hint: `${mod}+3`,
      keywords: ["lens", "convergent", "deduction", "logic", "proof", "precision", "analysis", "ai"],
      run: () => ctx.setActiveLens("CONVERGENT"),
    }),
    cmd("run-divergent", "Activate Divergent Lens", "Cognitive Lenses", {
      icon: "💡",
      hint: `${mod}+4`,
      keywords: ["lens", "divergent", "brainstorm", "lateral", "creativity", "ideas", "explore", "ai"],
      run: () => ctx.setActiveLens("DIVERGENT"),
    }),
    cmd("run-metacognitive", "Activate Metacognitive Lens", "Cognitive Lenses", {
      icon: "🪞",
      hint: `${mod}+5`,
      keywords: ["lens", "metacognitive", "reflection", "epistemology", "bias", "critique", "limits", "ai"],
      run: () => ctx.setActiveLens("METACOGNITIVE"),
    }),
    cmd("toggle-lens", "Toggle Lens AI chat panel", "Cognitive Lenses", {
      icon: "💬",
      hint: `${mod}+Shift+L`,
      keywords: ["lens", "chat", "panel", "sidebar", "assistant", "ai", "toggle", "discussion"],
      run: ctx.toggleLens,
    }),

    // ── Navigation & Views ────────────────────────────────────
    cmd("open-graph", "Open 3D Knowledge Graph", "Navigation & Views", {
      icon: "🌐",
      hint: "Cognitive profile & nodes",
      keywords: ["graph", "knowledge", "3d", "profile", "nodes", "network", "visualization", "map"],
      run: () => ctx.navigate("/profile"),
    }),
    cmd("open-history", "Open session history", "Navigation & Views", {
      icon: "📜",
      hint: "Past dialogues & logs",
      keywords: ["history", "sessions", "past", "archive", "logs", "previous", "completed"],
      run: () => ctx.navigate("/history"),
    }),
    cmd("new-session", "Start new cognitive dialogue session", "Navigation & Views", {
      icon: "⚡",
      hint: "Interactive Socratic trainer",
      keywords: ["session", "start", "dialogue", "chat", "socratic", "train", "tutor", "exercise"],
      run: () => ctx.navigate("/session"),
    }),
    cmd("toggle-explorer", "Toggle document sidebar / library", "Navigation & Views", {
      icon: "📁",
      hint: `${mod}+B`,
      keywords: ["sidebar", "explorer", "library", "documents", "files", "tree", "toggle"],
      run: ctx.toggleExplorer,
    }),

    // ── Settings & Tools ──────────────────────────────────────
    cmd("open-settings", "Open settings & AI model config", "Settings & Tools", {
      icon: "⚙️",
      hint: "API keys & models",
      keywords: ["settings", "models", "gemini", "api key", "config", "preferences", "options", "setup"],
      run: () => ctx.openActivity("settings"),
    }),
    cmd(
      "toggle-beta",
      ctx.betaModes ? "Turn off beta thinking modes" : "Turn on beta thinking modes",
      "Settings & Tools",
      {
        icon: "🧪",
        hint: "Default Mode Network (DMN)",
        keywords: ["beta", "modes", "experimental", "dmn", "features", "toggle"],
        run: () => ctx.setBetaModes(!ctx.betaModes),
      }
    ),

    // ── Help & Shortcuts ──────────────────────────────────────
    cmd("show-shortcuts", "Show all keyboard shortcuts & hotkeys", "Help & Shortcuts", {
      icon: "⌨️",
      hint: "Cheatsheet",
      keywords: ["help", "shortcuts", "hotkeys", "keys", "commands", "cheatsheet", "guide", "keyboard"],
      run: () => {
        if (ctx.showShortcuts) ctx.showShortcuts();
        else ctx.openPaletteOnly();
      },
    }),
  ];
}
