/**
 * Yentellect workbench — Command palette (Stage 1, C4). Part 1/2:
 * state, filtering, keyboard map, focus handling.
 *
 * Cmd+K opens it. Arrow/Home/End move the selection, Enter runs the
 * command, Escape closes. Disabled entries (stage gates) are listed with
 * their reason — never hidden, never silently dead.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { WorkbenchCommand } from "@/lib/workbench/commands";

export interface CommandPaletteProps {
  open: boolean;
  commands: WorkbenchCommand[];
  onClose: () => void;
}

export default function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const reduceMotion = useReducedMotion();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.id.includes(q)
    );
  }, [commands, query]);

  // Reset per open; focus the input once the dialog is mounted.
  useEffect(() => {
    setQuery("");
    setIndex(0);
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
      setIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(Math.max(0, results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[index]);
    } else if (e.key === "Tab") {
      // Focus trap: only the input is focusable inside the dialog.
      e.preventDefault();
    }
  };


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
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={reduceMotion ? {} : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="w-full max-w-md rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-1)] shadow-palette overflow-hidden"
            onKeyDown={onKeyDown}
          >
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-list"
              aria-autocomplete="list"
              aria-activedescendant={
                results[index] ? `palette-opt-${results[index].id}` : undefined
              }
              aria-label="Type a command"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIndex(0);
              }}
              placeholder="Type a command…"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] border-b border-[var(--border)] focus:outline-none"
            />
            <ul
              ref={listRef}
              id="palette-list"
              role="listbox"
              aria-label="Commands"
              className="max-h-72 overflow-y-auto py-1"
            >
              {results.length === 0 && (
                <li
                  role="option"
                  aria-selected="false"
                  className="px-4 py-3 text-sm text-[var(--text-dim)]"
                >
                  No matching command.
                </li>
              )}
              {results.map((cmd, i) => (
                <li
                  key={cmd.id}
                  id={`palette-opt-${cmd.id}`}
                  role="option"
                  data-index={i}
                  aria-selected={i === index}
                  aria-disabled={!cmd.enabled}
                  onMouseMove={() => setIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(cmd);
                  }}
                  title={
                    !cmd.enabled && cmd.disabledReason ? cmd.disabledReason : undefined
                  }
                  className={`px-4 py-2 text-sm flex items-center justify-between gap-3 ${
                    i === index
                      ? "bg-[var(--bg-2)] text-[var(--text)]"
                      : "text-[var(--text-dim)]"
                  } ${cmd.enabled ? "cursor-pointer" : "opacity-60"}`}
                >
                  <span>
                    {cmd.title}
                    {!cmd.enabled && cmd.disabledReason && (
                      <span className="block text-[11px] text-[var(--text-dim)]">
                        {cmd.disabledReason}
                      </span>
                    )}
                  </span>
                  {cmd.hint && (
                    <kbd className="text-[11px] text-[var(--text-dim)] shrink-0">
                      {cmd.hint}
                    </kbd>
                  )}
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
