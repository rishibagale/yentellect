/**
 * Yentellect workbench — layout persistence (Stage 1).
 *
 * Versioned localStorage key so a future schema can migrate cleanly.
 * Sizes are clamped on read AND write: a hand-edited or stale value can
 * never wedge the shell into an unusable geometry.
 */
import type { ImportedDoc } from "./import-client";

export const LAYOUT_STORAGE_KEY = "yentellect.layout.v1";

export type Activity = "explorer" | "graph" | "settings";

export interface LayoutState {
  activity: Activity;
  explorerOpen: boolean;
  explorerWidth: number;
  lensOpen: boolean;
  lensWidth: number;
  drawerOpen: boolean;
  drawerHeight: number;
}

export const DEFAULT_LAYOUT: LayoutState = {
  activity: "explorer",
  explorerOpen: true,
  explorerWidth: 240,
  lensOpen: true,
  lensWidth: 420,
  drawerOpen: true,
  drawerHeight: 200,
};

const LIMITS = {
  explorerWidth: [160, 760] as const,
  lensWidth: [280, 800] as const,
  drawerHeight: [120, 520] as const,
};

function clamp(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
}

/** Merge a patch over a base state, clamping every bounded dimension. */
export function clampLayout(base: LayoutState, patch: Partial<LayoutState>): LayoutState {
  const merged = { ...base, ...patch };
  return {
    activity: merged.activity,
    explorerOpen: merged.explorerOpen,
    explorerWidth: clamp(merged.explorerWidth, DEFAULT_LAYOUT.explorerWidth, ...LIMITS.explorerWidth),
    lensOpen: merged.lensOpen,
    lensWidth: clamp(merged.lensWidth, DEFAULT_LAYOUT.lensWidth, ...LIMITS.lensWidth),
    drawerOpen: merged.drawerOpen,
    drawerHeight: clamp(merged.drawerHeight, DEFAULT_LAYOUT.drawerHeight, ...LIMITS.drawerHeight),
  };
}

const ACTIVITIES: Activity[] = ["explorer", "graph", "settings"];

/** Read persisted layout; never throws, never returns invalid data. */
export function loadLayout(): LayoutState {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<LayoutState>;
    return clampLayout(DEFAULT_LAYOUT, {
      ...parsed,
      activity: ACTIVITIES.includes(parsed.activity as Activity)
        ? (parsed.activity as Activity)
        : DEFAULT_LAYOUT.activity,
    });
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout: LayoutState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* storage full or blocked — layout persistence is best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Small per-user preferences (Stage 1+). userField feeds the lens     */
/* prompts; betaModes gates the hidden lens modes. Anything that reads */
/* or writes these goes through here so the keys cannot drift, and all */
/* functions are SSR-safe (typeof window guard + try/catch).           */
/* ------------------------------------------------------------------ */

export const USER_FIELD_KEY = "yentellect.userField.v1";
export const BETA_MODES_KEY = "yentellect.betaModes.v1";

/** The user's research area, free text. Empty string when never set. */
export function readUserField(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(USER_FIELD_KEY) || "";
  } catch {
    return "";
  }
}

export function writeUserField(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_FIELD_KEY, value);
  } catch {
    /* best-effort */
  }
}

/** Beta lens modes visible in the switcher. Default off. */
export function readBetaModes(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BETA_MODES_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeBetaModes(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BETA_MODES_KEY, on ? "1" : "0");
  } catch {
    /* best-effort */
  }
}

/* ------------------------------------------------------------------ */
/* Legacy pinned paper (Stage 4) — MIGRATION ONLY.                      */
/*                                                                     */
/* The pinned paper was the single open document before tabs. Stage 3 */
/* folded it into the library and the tab list, so this key is READ   */
/* exactly once (to migrate an existing paper) and then deleted.      */
/* There is deliberately NO writer: writing it again would resurrect  */
/* a key nothing reads.                                                */
/* ------------------------------------------------------------------ */

export const DOC_STORAGE_KEY = "yentellect.doc.v1";

function isImportedDoc(value: unknown): value is ImportedDoc {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const doc = value as Record<string, unknown>;
  if (typeof doc.id !== "string" || !doc.id) return false;
  if (typeof doc.title !== "string" || !doc.title) return false;
  if (!Array.isArray(doc.authors) || !doc.authors.every((a) => typeof a === "string")) return false;
  if (doc.year !== null && typeof doc.year !== "string") return false;
  if (doc.abstract !== null && typeof doc.abstract !== "string") return false;
  if (doc.source !== "arxiv" && doc.source !== "crossref") return false;
  if (typeof doc.url !== "string" || !doc.url) return false;
  return true;
}

/** The last imported paper, or null. Never throws. Migration only. */
export function readDoc(): ImportedDoc | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DOC_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isImportedDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDoc(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DOC_STORAGE_KEY);
  } catch {
    /* best-effort */
  }
}
