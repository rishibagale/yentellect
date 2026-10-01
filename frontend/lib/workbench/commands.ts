/**
 * Yentellect workbench — command registry (Stage 1, C4).
 *
 * One registry feeds the palette, the keyboard shortcuts, and (later) the
 * Explorer context menu, so the three surfaces cannot drift out of sync.
 * Commands whose stage HAS landed are enabled and do real work; commands
 * whose stage has not landed are listed disabled with a reason — never
 * hidden, never silently dead.
 *
 * Reformed (Stage 1): the previously dashboard-only destinations are now
 * first-class commands — New session → /session, Open history → /history,
 * Open settings → the Settings activity view (shared SettingsForm), and
 * Open graph → the profile knowledge graph until the Stage 6 tab lands.
 */
"use client";

import type { ThinkingMode } from "@/lib/modes";
import type { Activity } from "./storage";

export type CommandId =
  | "import-paper"
  | "new-concept"
  | "new-note"
  | "new-session"
  | "open-history"
  | "open-settings"
  | "run-analogical"
  | "run-systems"
  | "open-graph"
  | "toggle-beta"
  | "toggle-explorer"
  | "toggle-lens"
  | "toggle-drawer";

export interface WorkbenchCommand {
  id: CommandId;
  title: string;
  hint?: string;
  /** Stage gate: false + reason renders the entry disabled, never silently dead. */
  enabled: boolean;
  disabledReason?: string;
  run: () => void;
}

export interface CommandContext {
  toggleExplorer: () => void;
  toggleLens: () => void;
  toggleDrawer: () => void;
  openPaletteOnly: () => void;
  betaModes: boolean;
  setBetaModes: (on: boolean) => void;
  activeLens: ThinkingMode;
  setActiveLens: (lens: ThinkingMode) => void;
  navigate: (path: string) => void;
  openActivity: (a: Activity) => void;
}

/**
 * Build the spec's command list for the current state. Later stages mutate
 * `enabled` here rather than forking a second list elsewhere.
 */
export function buildCommands(ctx: CommandContext): WorkbenchCommand[] {
  const cmd = (
    id: CommandId,
    title: string,
    rest: Partial<WorkbenchCommand> & { run: () => void }
  ): WorkbenchCommand => ({ id, title, enabled: true, ...rest });

  return [
    cmd("import-paper", "Import paper", {
      hint: "arXiv URL or DOI",
      enabled: false,
      disabledReason: "Import lands in Stage 4",
      run: () => {},
    }),
    cmd("new-concept", "New concept", {
      enabled: false,
      disabledReason: "Notes land in Stage 2",
      run: () => {},
    }),
    cmd("new-note", "New note", {
      enabled: false,
      disabledReason: "Notes land in Stage 2",
      run: () => {},
    }),
    cmd("new-session", "New session", {
      hint: "Socratic training",
      run: () => ctx.navigate("/session"),
    }),
    cmd("open-history", "Open history", {
      hint: "Training history",
      run: () => ctx.navigate("/history"),
    }),
    cmd("open-settings", "Open settings", {
      run: () => ctx.openActivity("settings"),
    }),
    cmd("run-analogical", "Run Analogical lens", {
      hint: "Cmd+1",
      run: () => ctx.setActiveLens("ANALOGICAL"),
    }),
    cmd("run-systems", "Run Systems lens", {
      hint: "Cmd+2",
      run: () => ctx.setActiveLens("SYSTEMS"),
    }),
    cmd("open-graph", "Open graph", {
      hint: "Profile graph; Stage 6 moves it here",
      run: () => ctx.navigate("/profile"),
    }),
    cmd("toggle-beta", ctx.betaModes ? "Turn off beta modes" : "Turn on beta modes", {
      run: () => ctx.setBetaModes(!ctx.betaModes),
    }),
    cmd("toggle-explorer", "Toggle sidebar", {
      hint: "Cmd+B",
      run: ctx.toggleExplorer,
    }),
    cmd("toggle-lens", "Toggle lens panel", {
      hint: "Cmd+Shift+L",
      run: ctx.toggleLens,
    }),
    cmd("toggle-drawer", "Toggle drawer", {
      hint: "Cmd+J",
      run: ctx.toggleDrawer,
    }),
  ];
}
