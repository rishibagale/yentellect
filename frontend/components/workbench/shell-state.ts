/**
 * Yentellect workbench — shell state (Stage 1/4). Part 1/2.
 * Lens + beta + viewport state that isn't geometry (geometry lives in
 * LayoutProvider), plus the paper-import flow. Produces the
 * CommandContext for the registry.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayout, type Activity } from "@/lib/workbench/layout";
import {
  readBetaModes,
  writeBetaModes,
  readDoc,
  writeDoc,
} from "@/lib/workbench/storage";
import { importPaper, type ImportedDoc } from "@/lib/workbench/import-client";
import type { ThinkingMode } from "@/lib/modes";
import { buildCommands, type CommandContext } from "@/lib/workbench/commands";

export type ImportStatus = "idle" | "loading" | "error";

export type ViewportSize = "phone" | "tablet" | "desktop";

export function useViewport(): ViewportSize {
  const [size, setSize] = useState<ViewportSize>("desktop");
  useEffect(() => {
    const apply = () => {
      const w = window.innerWidth;
      if (w < 768) setSize("phone");
      else if (w < 1024) setSize("tablet");
      else setSize("desktop");
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
  return size;
}

export function useShellState() {
  const { layout, update, toggleExplorer, toggleLens, toggleDrawer, setPaletteOpen } =
    useLayout();
  const router = useRouter();
  const [activeLens, setActiveLensState] = useState<ThinkingMode>("ANALOGICAL");
  const [betaModes, setBetaModesState] = useState<boolean>(() => readBetaModes());
  const [narrow, setNarrow] = useState(false);
  const viewport = useViewport();
  const [doc, setDoc] = useState<ImportedDoc | null>(() => readDoc());
  const [importOpen, setImportOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const importingRef = useRef(false);

  // Minimum supported width is 1024px (C7); below that show a plain notice.
  // Kept for backwards compat with MinWidthNotice.
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

  /** Open the editor's import prompt (palette "Import paper"). */
  const openImport = useCallback(() => {
    setImportOpen(true);
    setImportStatus("idle");
    setImportError(null);
  }, []);

  /** Closing the prompt always returns it to a clean idle state. */
  const closeImport = useCallback(() => {
    setImportOpen(false);
    setImportStatus("idle");
    setImportError(null);
  }, []);

  /**
   * Fetch metadata for a pasted arXiv URL or DOI. Double submits are
   * ignored; success stores the doc and closes the prompt, failure leaves
   * the prompt open with a friendly error.
   */
  const submitImport = useCallback(
    async (raw: string) => {
      const target = raw.trim();
      if (!target || importingRef.current) return;
      importingRef.current = true;
      setImportStatus("loading");
      setImportError(null);
      try {
        const next = await importPaper(target);
        setDoc(next);
        writeDoc(next);
        closeImport();
      } catch (err) {
        setImportStatus("error");
        setImportError(
          err instanceof Error && err.message ? err.message : "Couldn't import that paper."
        );
      } finally {
        importingRef.current = false;
      }
    },
    [closeImport]
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
    openImport,
  };

  return {
    layout,
    activeLens,
    setActiveLens,
    betaModes,
    setBetaModes,
    ctx,
    narrow,
    viewport,
    isPhone: viewport === "phone",
    isTablet: viewport === "tablet",
    isDesktop: viewport === "desktop",
    importOpen,
    importStatus,
    importError,
    doc,
    openImport,
    closeImport,
    submitImport,
  };
}
