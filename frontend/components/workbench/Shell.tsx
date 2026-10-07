/**
 * Yentellect workbench — shell render (Stage 1). Part 3/3.
 * title 36 / activity 48 / explorer 240 / editor flex / lens 360 /
 * drawer 200 default / status 24. Below 1024px: plain notice.
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
import { useShellState } from "./shell-state";
import { useShellKeys } from "./shell-keys";

function ShellInner() {
  const { layout, update, toggleExplorer, toggleLens, toggleDrawer, setActivity, setPaletteOpen } =
    useLayout();
  const { activeLens, setActiveLens, betaModes, setBetaModes, ctx, narrow } = useShellState();
  const commands = buildCommands(ctx);

  useShellKeys({
    paletteOpen: layout.paletteOpen,
    setPaletteOpen,
    toggleExplorer,
    toggleLens,
    toggleDrawer,
    setActiveLens,
  });

  if (narrow) return <MinWidthNotice />;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-0)] text-[var(--text)]">
      <TitleBar onOpenPalette={() => setPaletteOpen(true)} />
      <div className="flex-1 flex min-h-0">
        <ActivityBar activity={layout.activity} onSelect={setActivity} />
        {layout.explorerOpen && (
          <>
            <div style={{ width: layout.explorerWidth }} className="shrink-0 min-w-0">
              <SidePanelView
                activity={layout.activity}
                betaModes={betaModes}
                onToggleBetaModes={setBetaModes}
              />
            </div>
            <Splitter
              orientation="vertical"
              label="Explorer"
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
            <EditorArea onOpenPalette={() => setPaletteOpen(true)} />
            {layout.lensOpen && (
              <>
                <Splitter
                  orientation="vertical"
                  label="Lens panel"
                  paneId="pane-lens"
                  value={72}
                  open={layout.lensOpen}
                  onToggle={toggleLens}
                  onChange={(v) => update({ lensWidth: Math.round(640 - (v / 100) * 400) })}
                />
                <div style={{ width: layout.lensWidth }} className="shrink-0 min-w-0">
                  <LensPanel activeLens={activeLens} onSelect={setActiveLens} betaModes={betaModes} />
                </div>
              </>
            )}
          </div>
          {layout.drawerOpen && (
            <>
              <Splitter
                orientation="horizontal"
                label="Connections"
                paneId="pane-connections"
                value={60}
                open={layout.drawerOpen}
                onToggle={toggleDrawer}
                onChange={(v) => update({ drawerHeight: Math.round(480 - (v / 100) * 360) })}
              />
              <div style={{ height: layout.drawerHeight }} className="shrink-0 min-h-0">
                <ConnectionsDrawer />
              </div>
            </>
          )}
        </div>
      </div>
      <StatusBar activeLens={activeLens} words={0} kept={0} saved />
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
