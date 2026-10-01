/**
 * Yentellect workbench — shell keyboard shortcuts (Stage 1, part 2/2).
 * Cmd+K palette; Cmd+B sidebar; Cmd+J drawer; Cmd+Shift+L lens panel;
 * Cmd+1 / Cmd+2 active lens. Same registry the palette shows (C4).
 */
"use client";

import { useEffect } from "react";
import type { ThinkingMode } from "@/lib/modes";

interface KeysArgs {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  toggleExplorer: () => void;
  toggleLens: () => void;
  toggleDrawer: () => void;
  setActiveLens: (lens: ThinkingMode) => void;
}

export function useShellKeys(args: KeysArgs) {
  const {
    paletteOpen,
    setPaletteOpen,
    toggleExplorer,
    toggleLens,
    toggleDrawer,
    setActiveLens,
  } = args;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "k") {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      } else if (k === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleExplorer();
      } else if (k === "j" && !e.shiftKey) {
        e.preventDefault();
        toggleDrawer();
      } else if (k === "l" && e.shiftKey) {
        e.preventDefault();
        toggleLens();
      } else if (k === "1" && !e.shiftKey) {
        e.preventDefault();
        setActiveLens("ANALOGICAL");
      } else if (k === "2" && !e.shiftKey) {
        e.preventDefault();
        setActiveLens("SYSTEMS");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen, toggleExplorer, toggleDrawer, toggleLens, setActiveLens]);
}
