/**
 * Yentellect workbench — LayoutProvider (Stage 1, C2/C3).
 *
 * Single source of truth for shell geometry + activity + palette state.
 * Geometry persists to localStorage; paletteOpen does not (a palette left
 * open across reloads is a bug, not a preference).
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LAYOUT,
  clampLayout,
  loadLayout,
  saveLayout,
  type Activity,
  type LayoutState,
} from "./storage";

export type { Activity, LayoutState };

interface LayoutContextValue {
  layout: LayoutState & { paletteOpen: boolean };
  update: (patch: Partial<LayoutState>) => void;
  toggleExplorer: () => void;
  toggleLens: () => void;
  toggleDrawer: () => void;
  setActivity: (a: Activity) => void;
  setPaletteOpen: (open: boolean) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<LayoutState & { paletteOpen: boolean }>(() => ({
    ...DEFAULT_LAYOUT,
    paletteOpen: false,
    ...loadLayout(),
  }));

  // Persist geometry after mount (loadLayout already ran before first paint).
  useEffect(() => {
    const { paletteOpen: _p, ...geometry } = layout;
    void _p;
    saveLayout(geometry);
  }, [layout]);

  const update = useCallback((patch: Partial<LayoutState>) => {
    setLayout((prev) => {
      const { paletteOpen, ...base } = prev;
      return { ...clampLayout(base, patch), paletteOpen };
    });
  }, []);

  const toggleExplorer = useCallback(
    () => setLayout((prev) => ({ ...prev, explorerOpen: !prev.explorerOpen })),
    []
  );
  const toggleLens = useCallback(
    () => setLayout((prev) => ({ ...prev, lensOpen: !prev.lensOpen })),
    []
  );
  const toggleDrawer = useCallback(
    () => setLayout((prev) => ({ ...prev, drawerOpen: !prev.drawerOpen })),
    []
  );
  const setActivity = useCallback(
    (activity: Activity) => setLayout((prev) => ({ ...prev, activity })),
    []
  );
  const setPaletteOpen = useCallback(
    (paletteOpen: boolean) => setLayout((prev) => ({ ...prev, paletteOpen })),
    []
  );

  const value = useMemo(
    () => ({ layout, update, toggleExplorer, toggleLens, toggleDrawer, setActivity, setPaletteOpen }),
    [layout, update, toggleExplorer, toggleLens, toggleDrawer, setActivity, setPaletteOpen]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
