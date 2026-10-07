/**
 * Yentellect workbench — shell state (Stage 1). Part 1/2.
 * Lens + beta + viewport state that isn't geometry (geometry lives in
 * LayoutProvider). Produces the CommandContext for the registry.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayout, type Activity } from "@/lib/workbench/layout";
import { readBetaModes, writeBetaModes } from "@/lib/workbench/storage";
import type { ThinkingMode } from "@/lib/modes";
import { buildCommands, type CommandContext } from "@/lib/workbench/commands";

export function useShellState() {
  const { layout, update, toggleExplorer, toggleLens, toggleDrawer, setPaletteOpen } =
    useLayout();
  const router = useRouter();
  const [activeLens, setActiveLensState] = useState<ThinkingMode>("ANALOGICAL");
  const [betaModes, setBetaModesState] = useState<boolean>(() => readBetaModes());
  const [narrow, setNarrow] = useState(false);

  // Minimum supported width is 1024px (C7); below that show a plain notice.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /** Persisting beta toggle: keeps localStorage and shell state in sync. */
  const setBetaModes = useCallback((on: boolean) => {
    writeBetaModes(on);
    setBetaModesState(on);
  }, []);

  const setActiveLens = useCallback((lens: ThinkingMode) => {
    setActiveLensState(lens);
  }, []);

  const openPaletteOnly = useCallback(() => setPaletteOpen(true), [setPaletteOpen]);

  /** Route navigation for palette commands (session / history / profile). */
  const navigate = useCallback((path: string) => router.push(path), [router]);

  /**
   * Select a side-panel activity AND ensure the side panel is open — what
   * "Open settings" means from the palette, matching a click on the activity
   * bar exactly.
   */
  const openActivity = useCallback(
    (a: Activity) => update({ activity: a, explorerOpen: true }),
    [update]
  );

  const ctx: CommandContext = {
    toggleExplorer,
    toggleLens,
    toggleDrawer,
    openPaletteOnly,
    betaModes,
    setBetaModes,
    activeLens,
    setActiveLens,
    navigate,
    openActivity,
  };

  return { layout, activeLens, setActiveLens, betaModes, setBetaModes, ctx, narrow };
}
