/**
 * Yentellect workbench — shell render (Stage 1 + Package 4 mobile).
 * title 36 / activity 48 / explorer 240 / editor flex / lens 360 /
 * drawer 200 default / status 24.
 * Phone (<768px): explorer & lens as drawers, full-width editor.
 * Tablet (768-1023px): explorer drawer, lens collapsible panel.
 * Desktop (≥1024px): full three-pane layout.
 */
"use client";

import TitleBar from "./TitleBar";
import ActivityBar from "./ActivityBar";
import SidePanelView from "./SidePanelView";
import LensPanel from "./LensPanel";
import EditorArea from "./EditorArea";
import ConnectionsDrawer from "./ConnectionsDrawer";
import StatusBar from "./StatusBar";
import Splitter from "./Splitter";
import CommandPalette from "./CommandPalette";
import MinWidthNotice from "./MinWidthNotice";
import { LayoutProvider, useLayout } from "@/lib/workbench/layout";
import { buildCommands } from "@/lib/workbench/commands";
import { useLensThread } from "@/lib/workbench/lens-thread";
import { thinkingModeToLensId } from "@/lib/workbench/lens-client";
import type { ThinkingMode } from "@/lib/modes";
import { useShellState } from "./shell-state";
import { useShellKeys } from "./shell-keys";
import { useState, useEffect } from "react";

function ShellInner() {
  const { layout, update, toggleExplorer, toggleLens, setActivity, setPaletteOpen } =
    useLayout();
  const {
    activeLens,
    setActiveLens,
    betaModes,
    setBetaModes,
    ctx,
    narrow,
    viewport,
    isPhone,
    isTablet,
    isDesktop,
    importOpen,
    importStatus,
    importError,
    doc,
    tabs,
    activeTabId,
    library,
    openDoc,
    loadDemo,
    removeDoc,
    openImport,
    selectTab,
    closeTab,
    renameTab,
    closeImport,
    submitImport,
    submitFileImport,
    submitCustomDoc,
  } = useShellState();
  const commands = buildCommands(ctx);

  useShellKeys({
    paletteOpen: layout.paletteOpen,
    setPaletteOpen,
    toggleExplorer,
    toggleLens,
    setActiveLens,
  });

  const lens = thinkingModeToLensId(activeLens);
  const docContext = doc
    ? {
        title: doc.title,
        kind: doc.kind,
        ...(doc.abstract ? { abstract: doc.abstract } : {}),
      }
    : null;
  const thread = useLensThread({ lens, doc: docContext });

  /** "Send note to lens": open the panel, then send the note as the selection. */
  const askLens = (text: string, mode?: ThinkingMode): void => {
    if (mode) setActiveLens(mode);
    update({ lensOpen: true });
    void thread.send(text);
  };

  // On mobile/tablet, lens panel is a bottom sheet when open
  const [lensSheetOpen, setLensSheetOpen] = useState(false);

  // Sync active document with local MCP bridge if running
  useEffect(() => {
    if (!doc) return;
    try {
      fetch("http://127.0.0.1:8787/api/active-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: doc.title,
          abstract: doc.abstract || "",
          source: doc.source || doc.kind,
          url: doc.url || "",
          year: doc.year || "",
          body: doc.body ? doc.body.slice(0, 10000) : "",
        }),
      }).catch(() => {});
    } catch {}
  }, [doc]);

  if (narrow && isPhone) return <MinWidthNotice isPhone={true} />;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-0)] text-[var(--text)]">
      <TitleBar
        onOpenPalette={() => setPaletteOpen(true)}
        onToggleLens={toggleLens}
        lensOpen={layout.lensOpen}
      />
      <div className="flex-1 flex min-h-0 relative">
        <ActivityBar activity={layout.activity} onSelect={setActivity} />
        
        {/* Explorer drawer on mobile/tablet */}
        {(isPhone || isTablet) && layout.explorerOpen && (
          <div
            className="fixed inset-y-0 left-0 z-40 w-[280px] max-w-[85vw] bg-[var(--bg-1)] border-r border-[var(--border)] transform transition-transform duration-200"
            style={{ transform: layout.explorerOpen ? "translateX(0)" : "translateX(-100%)" }}
            role="region"
            aria-label="Library"
          >
            <div className="h-full flex flex-col">
              <div className="p-2 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="text-sm font-medium text-[var(--text)]">Library</h3>
                <button
                  type="button"
                  onClick={toggleExplorer}
                  className="p-1 text-[var(--text-dim)] hover:text-[var(--text)]"
                  aria-label="Close explorer"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2">
                <SidePanelView
                  activity={layout.activity}
                  betaModes={betaModes}
                  onToggleBetaModes={setBetaModes}
                  doc={doc}
                  docs={library}
                  openDoc={openDoc}
                  onDeleteDoc={removeDoc}
                  thread={thread}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Backdrop for mobile/tablet drawers */}
        {((isPhone || isTablet) && layout.explorerOpen) && (
          <div
            className="fixed inset-0 z-30 bg-black/50"
            onClick={toggleExplorer}
            aria-hidden="true"
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 flex min-h-0 relative">
            {/* Explorer pane on desktop */}
            {isDesktop && layout.explorerOpen && (
              <>
                <div style={{ width: layout.explorerWidth }} className="shrink-0 min-w-0">
                  <SidePanelView
                    activity={layout.activity}
                    betaModes={betaModes}
                    onToggleBetaModes={setBetaModes}
                    doc={doc}
                    docs={library}
                    openDoc={openDoc}
                  onDeleteDoc={removeDoc}
                    thread={thread}
                  />
                </div>
                <Splitter
                  orientation="vertical"
                  label="Library"
                  paneId="pane-explorer"
                  value={25}
                  open={layout.explorerOpen}
                  onToggle={toggleExplorer}
                  onChange={(v) => update({ explorerWidth: Math.round(160 + (v / 100) * 600) })}
                />
              </>
            )}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <div className="flex-1 flex min-h-0">
                <EditorArea
                  onOpenPalette={() => setPaletteOpen(true)}
                  doc={doc}
                  tabs={tabs}
                  activeTabId={activeTabId}
                  onSelectTab={selectTab}
                  onCloseTab={closeTab}
                  onRenameTab={renameTab}
                  onLoadDemo={loadDemo}
                  onOpenImport={openImport}
                  importOpen={importOpen}
                  importStatus={importStatus}
                  importError={importError}
                  onSubmitImport={submitImport}
                  onSubmitFileImport={submitFileImport}
                  onSubmitCustomDoc={submitCustomDoc}
                  onCancelImport={closeImport}
                  onAskLens={askLens}
                />
                {/* Lens panel - desktop: side panel; mobile/tablet: bottom sheet */}
                {isDesktop && layout.lensOpen && (
                  <>
                    <Splitter
                      orientation="vertical"
                      label="Lens panel"
                      paneId="pane-lens"
                      value={72}
                      open={layout.lensOpen}
                      onToggle={toggleLens}
                      onChange={(v) => update({ lensWidth: Math.round(800 - (v / 100) * 520) })}
                    />
                    <div style={{ width: layout.lensWidth }} className="shrink-0 min-w-0 flex flex-col">
                      <div className="flex-1 min-h-0">
                        <LensPanel
                          activeLens={activeLens}
                          onSelect={setActiveLens}
                          betaModes={betaModes}
                          thread={thread}
                          docTitle={doc?.title ?? null}
                          drawerOpen={layout.drawerOpen}
                          onToggleDrawer={() => update({ drawerOpen: !layout.drawerOpen })}
                        />
                      </div>
                      {layout.drawerOpen && (
                        <>
                          <Splitter
                            orientation="horizontal"
                            label="Connections"
                            paneId="pane-connections"
                            value={50}
                            open={layout.drawerOpen}
                            onToggle={() => update({ drawerOpen: !layout.drawerOpen })}
                            onChange={(v) => update({ drawerHeight: Math.round(520 - (v / 100) * 400) })}
                          />
                          <div style={{ height: layout.drawerHeight }} className="shrink-0">
                            <ConnectionsDrawer thread={thread} />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Lens bottom sheet for mobile/tablet */}
        {(isPhone || isTablet) && lensSheetOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50"
              onClick={() => setLensSheetOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-1)] border-t border-[var(--border)] max-h-[70vh] flex flex-col"
              role="dialog"
              aria-label="Lens panel"
            >
              <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
                <h3 className="text-sm font-medium text-[var(--text)]">Lens</h3>
                <button
                  type="button"
                  onClick={() => setLensSheetOpen(false)}
                  className="p-1 text-[var(--text-dim)] hover:text-[var(--text)]"
                  aria-label="Close lens"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                <LensPanel
                  activeLens={activeLens}
                  onSelect={(lens) => { setActiveLens(lens); setLensSheetOpen(false); }}
                  betaModes={betaModes}
                  thread={thread}
                  docTitle={doc?.title ?? null}
                />
              </div>
            </div>
          </>
        )}
        
        {/* Open lens sheet button for mobile/tablet when lens is "open" but not in sheet */}
        {(isPhone || isTablet) && layout.lensOpen && !lensSheetOpen && (
          <button
            type="button"
            onClick={() => setLensSheetOpen(true)}
            className="fixed bottom-4 right-4 z-30 p-3 rounded-full bg-[var(--accent)] text-[var(--bg-1)] shadow-lg"
            aria-label="Open lens panel"
          >
            💡
          </button>
        )}
      </div>

      <StatusBar activeLens={activeLens} words={thread.selectionWords} kept={thread.keptCount} saved />
      <CommandPalette
        open={layout.paletteOpen}
        commands={commands}
        onClose={() => setPaletteOpen(false)}
      />
    </div>
  );
}

export default function Shell() {
  return (
    <LayoutProvider>
      <ShellInner />
    </LayoutProvider>
  );
}
