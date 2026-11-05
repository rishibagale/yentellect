/**
 * Yentellect workbench — Command palette (Stage 1, C4).
 *
 * Enhanced with:
 * - Category filter tabs (Research, Writing, Lenses, Navigation, Shortcuts)
 * - Deep keyword search & aliases
 * - Built-in Keyboard Shortcuts Cheatsheet
 * - Icons, category badges, and OS-aware shortcut tags
 * - Smooth arrow/mouse navigation and clear keyboard hints
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { WorkbenchCommand, CommandCategory } from "@/lib/workbench/commands";
import { isMacOS, getModKeyLabel } from "@/lib/workbench/commands";

export interface CommandPaletteProps {
  open: boolean;
  commands: WorkbenchCommand[];
  onClose: () => void;
}

type FilterCategory = "All" | CommandCategory | "Shortcuts";

export default function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>("All");
  const [modLabel, setModLabel] = useState("Ctrl");

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setModLabel(isMacOS() ? "⌘" : "Ctrl");
  }, []);

  // Filter commands by query and selected category
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();

    return commands.filter((c) => {
      // Category filter check
      if (selectedCategory !== "All") {
        if (selectedCategory === "Shortcuts") {
          // If in shortcuts tab, show commands that have hints or are under Help & Shortcuts
          if (!c.hint && c.category !== "Help & Shortcuts") return false;
        } else if (c.category !== selectedCategory) {
          return false;
        }
      }

      // Query search check
      if (!q) return true;

      const titleMatch = c.title.toLowerCase().includes(q);
      const idMatch = c.id.toLowerCase().includes(q);
      const hintMatch = c.hint ? c.hint.toLowerCase().includes(q) : false;
      const categoryMatch = c.category.toLowerCase().includes(q);
      const keywordMatch = c.keywords ? c.keywords.some((k) => k.toLowerCase().includes(q)) : false;

      return titleMatch || idMatch || hintMatch || categoryMatch || keywordMatch;
    });
  }, [commands, query, selectedCategory]);

  // Group commands by category when query is empty and category is "All"
  const groupedSections = useMemo(() => {
    if (query.trim() || selectedCategory !== "All") {
      return [{ category: null, items: filteredCommands }];
    }

    const map = new Map<CommandCategory, WorkbenchCommand[]>();
    for (const cmd of filteredCommands) {
      const arr = map.get(cmd.category) || [];
      arr.push(cmd);
      map.set(cmd.category, arr);
    }

    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [filteredCommands, query, selectedCategory]);

  // Flattened list for zero-based index navigation
  const flatResults = useMemo(() => {
    return groupedSections.flatMap((s) => s.items);
  }, [groupedSections]);

  // Reset per open; focus the input once the dialog is mounted.
  useEffect(() => {
    setQuery("");
    setIndex(0);
    setSelectedCategory("All");
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  // Keep the highlighted row visible.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [index, open]);

  const choose = (cmd?: WorkbenchCommand) => {
    if (!cmd || !cmd.enabled) return;
    cmd.run();
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(flatResults.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(Math.max(0, flatResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(flatResults[index]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Cycle category filter tabs on Tab!
      const categories: FilterCategory[] = [
        "All",
        "Research & Data",
        "Document & Writing",
        "Cognitive Lenses",
        "Navigation & Views",
        "Shortcuts",
      ];
      const nextIdx = (categories.indexOf(selectedCategory) + 1) % categories.length;
      setSelectedCategory(categories[nextIdx]);
      setIndex(0);
    }
  };

  const CATEGORY_TABS: Array<{ id: FilterCategory; label: string; icon: string }> = [
    { id: "All", label: "All", icon: "⚡" },
    { id: "Research & Data", label: "Research", icon: "📥" },
    { id: "Document & Writing", label: "Writing", icon: "📝" },
    { id: "Cognitive Lenses", label: "Lenses", icon: "🧠" },
    { id: "Navigation & Views", label: "Views", icon: "🧭" },
    { id: "Shortcuts", label: "Shortcuts", icon: "⌨️" },
  ];

  let runningIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.12, ease: "easeOut" }
          }
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] md:pt-[12vh] px-4 bg-black/60 backdrop-blur-xs"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reduceMotion ? {} : { opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--bg-1)] shadow-palette overflow-hidden flex flex-col max-h-[75vh]"
            onKeyDown={onKeyDown}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)] bg-[var(--bg-0)]">
              <svg
                className="w-4 h-4 text-[var(--accent)] shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                ref={inputRef}
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-autocomplete="list"
                aria-label="Search workbench commands"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIndex(0);
                }}
                placeholder="Search commands, papers, lenses (e.g. 'arxiv', 'split', 'latex', 'systems')…"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] px-1.5 py-0.5 rounded transition-colors"
                >
                  ✕
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-[var(--text-dim)] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-1)]">
                Esc
              </kbd>
            </div>

            {/* Quick Category Filter Pills */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)]/70 bg-[var(--bg-1)] overflow-x-auto no-scrollbar">
              {CATEGORY_TABS.map((tab) => {
                const active = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(tab.id);
                      setIndex(0);
                      inputRef.current?.focus();
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      active
                        ? "bg-[var(--accent)] text-[var(--bg-0)] font-semibold shadow-2xs"
                        : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]"
                    }`}
                  >
                    <span className="text-[11px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Command List Area */}
            <ul
              ref={listRef}
              id="palette-list"
              role="listbox"
              aria-label="Commands"
              className="flex-1 overflow-y-auto py-2 px-2 divide-y divide-transparent"
            >
              {flatResults.length === 0 ? (
                <li
                  role="option"
                  aria-selected="false"
                  className="px-6 py-10 text-center flex flex-col items-center justify-center text-[var(--text-dim)]"
                >
                  <span className="text-2xl mb-2">🔍</span>
                  <p className="text-sm font-medium text-[var(--text)] mb-1">
                    No commands matching &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs max-w-xs text-[var(--text-dim)] mb-4">
                    Try searching for &ldquo;paper&rdquo;, &ldquo;lens&rdquo;, &ldquo;latex&rdquo;, or &ldquo;split&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSelectedCategory("All");
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-0)] hover:bg-[var(--bg-2)] text-xs text-[var(--text)] transition-colors cursor-pointer"
                  >
                    Show all commands
                  </button>
                </li>
              ) : (
                groupedSections.map((section, sIdx) => (
                  <li key={section.category || sIdx} className="list-none">
                    {section.category && (
                      <div className="px-3 pt-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--text-dim)] font-semibold flex items-center justify-between">
                        <span>{section.category}</span>
                        <span className="text-[9px] opacity-60">
                          {section.items.length} {section.items.length === 1 ? "action" : "actions"}
                        </span>
                      </div>
                    )}
                    <div className="space-y-0.5">
                      {section.items.map((cmd) => {
                        const itemIndex = runningIndex++;
                        const isSelected = itemIndex === index;

                        return (
                          <div
                            key={cmd.id}
                            id={`palette-opt-${cmd.id}`}
                            role="option"
                            data-index={itemIndex}
                            aria-selected={isSelected}
                            aria-disabled={!cmd.enabled}
                            onMouseMove={() => setIndex(itemIndex)}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              choose(cmd);
                            }}
                            title={
                              !cmd.enabled && cmd.disabledReason
                                ? cmd.disabledReason
                                : undefined
                            }
                            className={`group px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-3 transition-colors ${
                              isSelected
                                ? "bg-[var(--bg-2)] text-[var(--text)] border border-[var(--border)]"
                                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)]/50 border border-transparent"
                            } ${cmd.enabled ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0 ${
                                  isSelected
                                    ? "bg-[var(--accent)]/15 text-[var(--accent)] font-bold"
                                    : "bg-[var(--bg-0)] border border-[var(--border)] text-[var(--text-dim)]"
                                }`}
                              >
                                {cmd.icon || "◈"}
                              </span>
                              <div className="min-w-0">
                                <span className="font-medium text-[13px] text-[var(--text)] block truncate">
                                  {cmd.title}
                                </span>
                                {!cmd.enabled && cmd.disabledReason ? (
                                  <span className="block text-[11px] text-amber-400">
                                    {cmd.disabledReason}
                                  </span>
                                ) : (
                                  cmd.keywords && (
                                    <span className="block text-[10.5px] text-[var(--text-dim)] truncate">
                                      {cmd.category} · {cmd.hint || cmd.keywords.slice(0, 3).join(", ")}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {cmd.hint && (
                              <kbd className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--bg-0)] text-[var(--text-dim)] group-hover:text-[var(--text)] shrink-0 font-medium">
                                {cmd.hint}
                              </kbd>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </li>
                ))
              )}
            </ul>

            {/* Footer with Keyboard Cheatsheet Hint */}
            <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-0)] flex items-center justify-between text-[11px] text-[var(--text-dim)] select-none">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono text-[9px] px-1 rounded bg-[var(--bg-1)] border border-[var(--border)]">
                    ↑↓
                  </kbd>{" "}
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono text-[9px] px-1 rounded bg-[var(--bg-1)] border border-[var(--border)]">
                    ↵
                  </kbd>{" "}
                  select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono text-[9px] px-1 rounded bg-[var(--bg-1)] border border-[var(--border)]">
                    Tab
                  </kbd>{" "}
                  switch tab
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-[10px]">{flatResults.length} commands available</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
