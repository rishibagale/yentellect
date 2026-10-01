/**
 * Yentellect workbench — shell state (Stage 1). Part 1/2.
 * Lens + beta + viewport state that isn't geometry (geometry lives in
 * LayoutProvider). Produces the CommandContext for the registry.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useLayout } from "@/lib/workbench/layout";
import type { ThinkingMode } from "@/lib/modes";
import { buildCommands, type CommandContext } from "@/lib/workbench/commands";

export function useShellState() {
  const { layout, toggleExplorer, toggleLens, toggleDrawer, setActivity, setPaletteOpen } =
    useLayout();
  const [activeLens, setActiveLensState] = useState<ThinkingMode>("ANALOGICAL");
  const [betaModes, setBetaModes] = useState(false);
  const [narrow, setNarrow] = useState(false);

  // Minimum supported width is 1024px (C7); below that show a plain notice.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const setActiveLens = useCallback((lens: ThinkingMode) => {
    setActiveLensState(lens);
  }, []);

  const openPaletteOnly = useCallback(() => setPaletteOpen(true), [setPaletteOpen]);

  const ctx: CommandContext = {
    toggleExplorer,
    toggleLens,
    toggleDrawer,
    openPaletteOnly,
    betaModes,
    setBetaModes,
    activeLens,
    setActiveLens,
  };

  return { layout, activeLens, setActiveLens, betaModes, ctx, narrow };
}
