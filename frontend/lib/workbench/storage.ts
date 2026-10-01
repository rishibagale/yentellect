/**
 * Yentellect workbench — layout persistence (Stage 1).
 *
 * Versioned localStorage key so a future schema can migrate cleanly.
 * Sizes are clamped on read AND write: a hand-edited or stale value can
 * never wedge the shell into an unusable geometry.
 */
export const LAYOUT_STORAGE_KEY = "yentellect.layout.v1";

export type Activity = "explorer" | "graph" | "search" | "settings";

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
  lensWidth: 360,
  drawerOpen: true,
  drawerHeight: 200,
};

const LIMITS = {
  explorerWidth: [160, 760] as const,
  lensWidth: [240, 560] as const,
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

const ACTIVITIES: Activity[] = ["explorer", "graph", "search", "settings"];

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
