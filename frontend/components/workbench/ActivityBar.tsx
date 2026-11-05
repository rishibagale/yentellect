/**
 * Yentellect workbench — Activity bar (Stage 1).
 * 48px wide: Library, Graph, Settings, and quick Command Palette trigger.
 */
"use client";

import type { Activity } from "@/lib/workbench/layout";
import { isMacOS } from "@/lib/workbench/commands";
import { useState, useEffect } from "react";

interface ActivityBarProps {
  activity: Activity;
  onSelect: (a: Activity) => void;
  onOpenPalette?: () => void;
}

const ITEMS: Array<{
  id: Activity;
  label: string;
  icon: (props: { active: boolean }) => React.ReactNode;
}> = [
  { id: "explorer", label: "Library", icon: ({ active }) => <ExplorerIcon active={active} /> },
  { id: "graph", label: "Graph", icon: ({ active }) => <GraphIcon active={active} /> },
  { id: "settings", label: "Settings", icon: ({ active }) => <SettingsIcon active={active} /> },
];

function base(active: boolean) {
  return `w-12 h-12 flex items-center justify-center transition-colors cursor-pointer ${
    active
      ? "text-[var(--text)]"
      : "text-[var(--text-dim)] hover:text-[var(--text)]"
  }`;
}

function ExplorerIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function GraphIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5} aria-hidden="true">
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 11l8-4M8 13l8 4" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003 1.008c-.253.255-.427.577-.476.914l-.377 2.042c-.067.361-.338.65-.7.672-.36.021-.74-.21-.9-.684l-.235-.99a1.125 1.125 0 01.473-1.238l1.86-1.4c.105-.08.21-.16.312-.244M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6.406 9.784a1.5 1.5 0 00-2.122 0l-.706.707a1.5 1.5 0 11-2.122-2.122l.707-.706a1.5 1.5 0 000-2.122l-.707-.707a1.5 1.5 0 00-2.121 0L12.91 15.53a1.5 1.5 0 000 2.122l.707.707a1.5 1.5 0 002.122 0l.706-.707a1.5 1.5 0 012.122 0l.707.707a1.5 1.5 0 002.122-2.122l-.707-.707z" />
    </svg>
  );
}

export default function ActivityBar({ activity, onSelect, onOpenPalette }: ActivityBarProps) {
  const [modLabel, setModLabel] = useState("Ctrl+");

  useEffect(() => {
    setModLabel(isMacOS() ? "⌘" : "Ctrl+");
  }, []);

  return (
    <nav
      data-region="activitybar"
      aria-label="Activity"
      className="w-12 shrink-0 flex flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--bg-1)] py-1"
    >
      <div className="flex flex-col items-center w-full">
        {ITEMS.map((item) => {
          const active = activity === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-label={item.label}
              aria-pressed={active}
              title={item.label}
              className={`${base(active)} relative`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-3 bottom-3 w-0.5 bg-[var(--accent)]"
                />
              )}
              <item.icon active={active} />
            </button>
          );
        })}
      </div>

      {onOpenPalette && (
        <div className="flex flex-col items-center pb-2">
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label={`Commands & Actions (${modLabel}K)`}
            title={`Commands & Actions (${modLabel}K)`}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </button>
        </div>
      )}
    </nav>
  );
}
