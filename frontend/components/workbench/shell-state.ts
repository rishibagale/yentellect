/**
 * Yentellect workbench — shell state (Stage 1/3/4). Part 1/2.
 * Lens + beta + viewport state that isn't geometry (geometry lives in
 * LayoutProvider), the open-tab list, and the paper-import flow. Produces
 * the CommandContext for the registry.
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayout, type Activity } from "@/lib/workbench/layout";
import {
  readBetaModes,
  writeBetaModes,
  readDoc,
  clearDoc,
} from "@/lib/workbench/storage";
import { importPaper, importFile } from "@/lib/workbench/import-client";
import {
  liveDocs,
  makeDocId,
  pendingBody,
  putDoc,
  deleteDoc,
  upsertImportedDoc,
  type WorkDoc,
  type DocKind,
} from "@/lib/workbench/db";
import {
  closeTab as closeTabState,
  openTab as openTabState,
  readTabs,
  renameTab as renameTabState,
  selectTab as selectTabState,
  writeTabs,
  type TabMeta,
  type TabState,
} from "@/lib/workbench/tabs";
import type { ThinkingMode } from "@/lib/modes";
import { buildCommands, type CommandContext } from "@/lib/workbench/commands";
import { loadSampleDoc } from "@/lib/workbench/sample-doc";

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
  const { layout, update, toggleExplorer, toggleLens, setPaletteOpen } =
    useLayout();
  const router = useRouter();
  const [activeLens, setActiveLensState] = useState<ThinkingMode>("ANALOGICAL");
  const [betaModes, setBetaModesState] = useState<boolean>(() => readBetaModes());
  const [narrow, setNarrow] = useState(false);
  const viewport = useViewport();
  const [importOpen, setImportOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>("idle");
  const [importError, setImportError] = useState<string | null>(null);
  const importingRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /* Open tabs                                                         */
  /* ---------------------------------------------------------------- */

  const [tabState, setTabState] = useState<TabState>(() => readTabs());
  const [library, setLibrary] = useState<WorkDoc[]>([]);
  /** Docs opened in this session, so a just-created doc shows immediately. */
  const openedRef = useRef(new Map<string, WorkDoc>());

  /** Open a document in a tab and focus it. */
  const openDoc = useCallback((doc: WorkDoc) => {
    openedRef.current.set(doc.id, doc);
    const meta: TabMeta = { id: doc.id, title: doc.title, kind: doc.kind };
    setTabState((prev) => openTabState(prev, meta));
  }, []);

  /** Focus an already-open tab. */
  const selectTab = useCallback((id: string) => {
    setTabState((prev) => selectTabState(prev, id));
  }, []);

  /** Close a tab. The active document follows the shell's tab rules. */
  const closeTab = useCallback((id: string) => {
    setTabState((prev) => closeTabState(prev, id));
  }, []);

  /** Rename a tab's title and sync it to the doc in Dexie. */
  const renameTab = useCallback(
    (id: string, title: string) => {
      setTabState((prev) => renameTabState(prev, id, title));
      const live = library.find((d) => d.id === id);
      if (live && live.title !== title) {
        void putDoc({ ...live, title, updatedAt: Date.now() });
      }
    },
    [library],
  );

  /** Delete a document from the library and close its tab if open. */
  const removeDoc = useCallback(
    async (id: string) => {
      await deleteDoc(id);
      openedRef.current.delete(id);
      closeTab(id);
    },
    [closeTab]
  );

  /** Load and open the sample demo paper. */
  const loadDemo = useCallback(async () => {
    const sample = await loadSampleDoc();
    openDoc(sample);
  }, [openDoc]);

  // Persist the tab list. Writing in an effect (not inside a state updater)
  // keeps the updater pure, so React's double-invoke in StrictMode cannot
  // write a half-applied state to disk.
  useEffect(() => {
    writeTabs(tabState);
  }, [tabState]);

  // The library list, live: a saved note shows up without a reload.
  useEffect(() => {
    const sub = liveDocs().subscribe({
      next: (value) => {
        if (Array.isArray(value)) setLibrary(value);
      },
      error: () => {
        /* live query unavailable; the list stays empty, the tabs still work */
      },
    });
    return () => sub.unsubscribe();
  }, []);

  /**
   * The active document. Its metadata comes from the live library, so a tab
   * switch shows the right document IMMEDIATELY (no flash of the previous
   * one) and its body is the newest one the editor has written — the
   * pending-body registry wins over what Dexie has confirmed, so a note
   * that is mid-save is never shown, and then re-saved, as an older copy.
   */
  const activeDoc = useMemo<WorkDoc | null>(() => {
    const id = tabState.activeId;
    if (!id) return null;
    const base = library.find((d) => d.id === id) ?? openedRef.current.get(id) ?? null;
    if (!base) return null;
    const pending = pendingBody(id);
    return pending === undefined ? base : { ...base, body: pending };
  }, [library, tabState.activeId]);

  // One-time migration: the pre-Stage-3 build kept a single "pinned paper"
  // in localStorage. Fold it into the library and open it as a tab, then
  // retire the old key so there is only ever one source of truth.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    if (tabState.migrated) return;
    const legacy = readDoc();
    if (!legacy) {
      setTabState((prev) => ({ ...prev, migrated: true }));
      return;
    }
    void upsertImportedDoc(legacy).then((doc) => {
      openedRef.current.set(doc.id, doc);
      const meta: TabMeta = { id: doc.id, title: doc.title, kind: doc.kind };
      setTabState((prev) => openTabState({ ...prev, migrated: true }, meta));
      clearDoc();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- */
  /* Viewport, lens, beta                                              */
  /* ---------------------------------------------------------------- */

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
   * ignored; success stores the doc in the library and opens it as a tab,
   * failure leaves the prompt open with a friendly error. Re-importing a
   * paper never destroys notes already written on it.
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
        const work = await upsertImportedDoc(next);
        openDoc(work);
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
    [closeImport, openDoc]
  );

  /**
   * Parse and import a local file (PDF, Markdown, Text, or CSV/JSON Dataset).
   */
  const submitFileImport = useCallback(
    async (file: File) => {
      if (importingRef.current) return;
      importingRef.current = true;
      setImportStatus("loading");
      setImportError(null);
      try {
        const next = await importFile(file);
        const work = await upsertImportedDoc(next);
        openDoc(work);
        closeImport();
      } catch (err) {
        setImportStatus("error");
        setImportError(
          err instanceof Error && err.message ? err.message : "Couldn't parse that document."
        );
      } finally {
        importingRef.current = false;
      }
    },
    [closeImport, openDoc]
  );

  /**
   * Save a pasted custom excerpt, abstract, or dataset text into the library.
   */
  const submitCustomDoc = useCallback(
    async (payload: { title: string; body: string; kind: DocKind }) => {
      const now = Date.now();
      const newDoc: WorkDoc = {
        id: makeDocId(payload.kind),
        kind: payload.kind,
        title: payload.title.trim() || `Untitled ${payload.kind}`,
        body: payload.body,
        createdAt: now,
        updatedAt: now,
      };
      await putDoc(newDoc);
      openDoc(newDoc);
      closeImport();
    },
    [closeImport, openDoc]
  );

  /** Create a blank concept/note and open it as a tab. */
  const createDoc = useCallback(
    (kind: "concept" | "note", title?: string) => {
      const now = Date.now();
      const newDoc: WorkDoc = {
        id: makeDocId(kind),
        kind,
        title: title?.trim() || (kind === "concept" ? "Untitled concept" : "Untitled note"),
        body: "",
        createdAt: now,
        updatedAt: now,
      };
      void putDoc(newDoc).then(() => openDoc(newDoc));
    },
    [openDoc]
  );

  const ctx: CommandContext = {
    toggleExplorer,
    toggleLens,
    openPaletteOnly,
    betaModes,
    setBetaModes,
    activeLens,
    setActiveLens,
    navigate,
    openActivity,
    openImport,
    createDoc,
  };

  /** Tab labels prefer the library's live title, falling back to the saved one. */
  const tabs = useMemo<TabMeta[]>(
    () =>
      tabState.tabs.map((t) => {
        const live = library.find((d) => d.id === t.id);
        return live ? { ...t, title: live.title } : t;
      }),
    [tabState.tabs, library]
  );

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
    doc: activeDoc,
    tabs,
    activeTabId: tabState.activeId,
    library,
    openImport,
    closeImport,
    submitImport,
    submitFileImport,
    submitCustomDoc,
    openDoc,
    selectTab,
    closeTab,
    renameTab,
    loadDemo,
    removeDoc,
  };
}
