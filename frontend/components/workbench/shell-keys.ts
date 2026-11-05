/**
 * Yentellect workbench — shell keyboard shortcuts (Stage 1, part 2/2).
 * Cmd+K / Ctrl+K / Ctrl+Shift+P palette;
 * Cmd+B / Ctrl+B sidebar;
 * Cmd+Shift+L / Ctrl+Shift+L lens panel;
 * Cmd+1..5 / Ctrl+1..5 active cognitive lenses.
 */
"use client";

import { useEffect } from "react";
import type { ThinkingMode } from "@/lib/modes";

interface KeysArgs {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  toggleExplorer: () => void;
  toggleLens: () => void;
  setActiveLens: (lens: ThinkingMode) => void;
}

export function useShellKeys(args: KeysArgs) {
  const {
    paletteOpen,
    setPaletteOpen,
    toggleExplorer,
    toggleLens,
    setActiveLens,
  } = args;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const k = e.key.toLowerCase();

      // Open / toggle Command Palette
      if (k === "k" || (k === "p" && e.shiftKey) || (k === "/" && !e.shiftKey)) {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
        return;
      }

      // Toggle Explorer / Sidebar
      if (k === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleExplorer();
        return;
      }

      // Toggle Lens Panel
      if (k === "l" && e.shiftKey) {
        e.preventDefault();
        toggleLens();
        return;
      }

      // Check if user is typing in an input
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing) return;

      // Lens shortcuts (Ctrl+1 to Ctrl+5)
      if (k === "1" && !e.shiftKey) {
        e.preventDefault();
        setActiveLens("ANALOGICAL");
      } else if (k === "2" && !e.shiftKey) {
        e.preventDefault();
        setActiveLens("SYSTEMS");
      } else if (k === "3" && !e.shiftKey) {
        e.preventDefault();
        setActiveLens("CONVERGENT");
      } else if (k === "4" && !e.shiftKey) {
        e.preventDefault();
        setActiveLens("DIVERGENT");
      } else if (k === "5" && !e.shiftKey) {
        e.preventDefault();
        setActiveLens("METACOGNITIVE");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, setPaletteOpen, toggleExplorer, toggleLens, setActiveLens]);
}
