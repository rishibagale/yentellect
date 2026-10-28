/**
 * Yentellect workbench — open-tab state (Stage 3).
 *
 * The tab strip is a list of OPEN DOCUMENTS, so a tab carries the doc's
 * identity and label, never its body. Bodies live in the Dexie library
 * (`lib/workbench/db.ts`); the editor loads the body for the active tab and
 * saves it back there. Keeping tabs as ids means a stale tab can never hold
 * a stale copy of a note.
 *
 * Persisted in localStorage so a reload returns to the same set of open
 * documents. All readers are SSR-safe (window guard + try/catch) and clamp
 * the list so a hand-edited value cannot wedge the shell.
 */
import type { DocKind } from "./db";

export const TABS_STORAGE_KEY = "yentellect.tabs.v1";

export interface TabMeta {
  id: string;
  title: string;
  kind: DocKind;
}

export interface TabState {
  tabs: TabMeta[];
  activeId: string | null;
  /** True once the legacy pinned-paper key has been folded into the tabs. */
  migrated: boolean;
}

export const EMPTY_TABS: TabState = { tabs: [], activeId: null, migrated: false };

export const MAX_TABS = 12;

function isDocKind(value: unknown): value is DocKind {
  return (
    value === "paper" ||
    value === "concept" ||
    value === "note" ||
    value === "article" ||
    value === "dataset"
  );
}

function isTabMeta(value: unknown): value is TabMeta {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const tab = value as Record<string, unknown>;
  if (typeof tab.id !== "string" || !tab.id) return false;
  if (typeof tab.title !== "string") return false;
  if (!isDocKind(tab.kind)) return false;
  return true;
}

/** Read the persisted tab state. Never throws; invalid data reads as empty. */
export function readTabs(): TabState {
  if (typeof window === "undefined") return EMPTY_TABS;
  try {
    const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
    if (!raw) return EMPTY_TABS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return EMPTY_TABS;
    }
    const record = parsed as Record<string, unknown>;
    if (!Array.isArray(record.tabs)) return EMPTY_TABS;
    const tabs = record.tabs.filter(isTabMeta).slice(0, MAX_TABS);
    const activeId =
      typeof record.activeId === "string" && tabs.some((t) => t.id === record.activeId)
        ? record.activeId
        : (tabs[0]?.id ?? null);
    return { tabs, activeId, migrated: record.migrated === true };
  } catch {
    return EMPTY_TABS;
  }
}

export function writeTabs(state: TabState): void {
  if (typeof window === "undefined") return;
  try {
    const tabs = state.tabs.slice(0, MAX_TABS);
    const activeId =
      state.activeId && tabs.some((t) => t.id === state.activeId)
        ? state.activeId
        : (tabs[0]?.id ?? null);
    window.localStorage.setItem(
      TABS_STORAGE_KEY,
      JSON.stringify({ tabs, activeId, migrated: state.migrated } satisfies TabState)
    );
  } catch {
    /* best-effort: tabs are a convenience, never a correctness requirement */
  }
}

/** Add (or refresh) a tab and make it active. Returns the new state. */
export function openTab(state: TabState, tab: TabMeta): TabState {
  const existing = state.tabs.find((t) => t.id === tab.id);
  const tabs = existing
    ? state.tabs.map((t) => (t.id === tab.id ? tab : t))
    : [...state.tabs, tab].slice(-MAX_TABS);
  return { ...state, tabs, activeId: tab.id };
}

/** Focus an existing tab. Unknown ids leave the state untouched. */
export function selectTab(state: TabState, id: string): TabState {
  if (!state.tabs.some((t) => t.id === id)) return state;
  return { ...state, activeId: id };
}

function normalizeTitle(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 120);
}

/**
 * Rename a tab's title. Normalizes the title (collapses whitespace, trims,
 * caps at 120 chars). Marks `migrated: true` so the legacy pinned-paper key
 * is treated as folded into the tabs. No-ops if the id is unknown or the
 * normalized title is empty.
 */
export function renameTab(state: TabState, id: string, title: string): TabState {
  if (!state || !id) return state;
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab) return state;
  const nextTitle = normalizeTitle(title);
  if (!nextTitle) return state;
  const tabs = state.tabs.map((t) =>
    t.id === id ? { ...t, title: nextTitle } : t,
  );
  return { ...state, tabs, migrated: true };
}

/**
 * Close a tab. The active tab moves to the neighbour on its right, or the
 * one on its left when the rightmost tab was closed; closing the last tab
 * leaves no active document.
 */
export function closeTab(state: TabState, id: string): TabState {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index === -1) return state;
  const tabs = state.tabs.filter((t) => t.id !== id);
  if (state.activeId !== id) {
    return { ...state, tabs };
  }
  const next = tabs[index] ?? tabs[index - 1] ?? null;
  return { ...state, tabs, activeId: next?.id ?? null };
}
