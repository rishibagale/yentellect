/**
 * Yentellect workbench — Lens panel (Phase C, clean minimalist interface).
 * Resizable, collapsible.
 *
 * Streamlined, distraction-free architecture:
 * 1. Single unified header (Socratic Lens title + mode toggle + Model Engine switcher + actions)
 * 2. Unobtrusive floating context indicator (no rigid horizontal dividing bars)
 * 3. Fluid chat message stream with rounded cards and calm typography
 * 4. Refined starter prompt suggestions with soft borders
 * 5. Minimalist bottom composer with no internal divider lines or clutter
 */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ThinkingMode } from "@/lib/modes";
import { MODES, visibleLenses } from "@/lib/modes";
import type { ConnectionEntry, LensThread } from "@/lib/workbench/lens-thread";
import { thinkingModeToLensId } from "@/lib/workbench/lens-client";
import { readEngineConfig, type EngineConfig } from "@/lib/workbench/engine-config";
import ModelSettingsModal from "./ModelSettingsModal";

interface LensPanelProps {
  activeLens: ThinkingMode;
  onSelect: (lens: ThinkingMode) => void;
  betaModes: boolean;
  thread: LensThread;
  docTitle?: string | null;
  drawerOpen?: boolean;
  onToggleDrawer?: () => void;
}

const CARD_BTN =
  "text-[11px] px-2.5 py-1 rounded-lg border border-[var(--border)]/60 hover:border-[var(--text-dim)] transition-colors";
const DIM_BTN = "text-[var(--text-dim)] hover:text-[var(--text)]";

const STARTER_PROMPTS: Record<string, string[]> = {
  ANALOGICAL: [
    "Find a structural analogy for this concept in a different scientific field",
    "Where does this analogy break down or fail to map?",
    "What are the non-obvious isomorphic principles here?",
  ],
  SYSTEMS: [
    "Map the key feedback loops and delayed systemic effects",
    "Where are the high-leverage intervention points?",
    "What systemic boundaries or assumptions are being taken for granted?",
  ],
};

/**
 * Entrance wrapper: message entrance only, 120ms easeOut, skipped entirely
 * under reduced motion (plain div, no transform).
 */
function Enter({
  reduce,
  className,
  children,
}: {
  reduce: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function ConnectionCard({
  entry,
  thread,
}: {
  entry: ConnectionEntry;
  thread: LensThread;
}) {
  const { connection, status } = entry;
  const kept = status === "kept";
  const discarded = status === "discarded";
  const isAnalogy = connection.type === "analogy";

  return (
    <div
      className={`w-full max-w-[72ch] border rounded-xl p-3 bg-[var(--bg-0)] shadow-2xs transition-all ${
        isAnalogy
          ? "border-l-3 border-l-[var(--accent)] border-[var(--border)]/60"
          : "border-l-3 border-l-[#9d7bff] border-[var(--border)]/60"
      } ${discarded ? "opacity-40" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-md ${
              isAnalogy
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "bg-[#9d7bff]/15 text-[#9d7bff]"
            }`}
          >
            {isAnalogy ? "Analogy" : "System Model"}
          </span>
          <span className="text-[10px] text-[var(--text-dim)]">
            {connection.confidence} confidence
          </span>
        </div>
        {kept && (
          <span className="text-[10px] font-medium text-[var(--accent)] flex items-center gap-1">
            <span>✓</span> Kept
          </span>
        )}
        {discarded && (
          <span className="text-[10px] text-[var(--text-dim)]">
            Discarded
          </span>
        )}
      </div>

      <p className="text-[13px] leading-relaxed text-[var(--text)] mb-2.5">
        {connection.summary}
      </p>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]/40">
        <button
          type="button"
          onClick={() => thread.keep(entry.id)}
          className={`${CARD_BTN} ${
            kept
              ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40 font-medium"
              : "text-[var(--text)] hover:border-[var(--accent)]"
          }`}
        >
          {kept ? "✓ Kept" : "Keep connection"}
        </button>
        <button
          type="button"
          onClick={() => thread.discard(entry.id)}
          className={`${CARD_BTN} ${discarded ? "text-[var(--text-dim)] border-transparent" : DIM_BTN}`}
        >
          Discard
        </button>
        {status === "open" && (
          <button
            type="button"
            disabled={thread.status === "sending"}
            onClick={() => void thread.askWhy(entry.id)}
            className={`${CARD_BTN} ${DIM_BTN} disabled:opacity-50 disabled:cursor-not-allowed ml-auto`}
          >
            Ask why →
          </button>
        )}
      </div>
    </div>
  );
}

export default function LensPanel({
  activeLens,
  onSelect,
  betaModes,
  thread,
  docTitle = null,
  drawerOpen = false,
  onToggleDrawer,
}: LensPanelProps) {
  const lenses = visibleLenses(betaModes);
  const [draft, setDraft] = useState("");
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(readEngineConfig);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();

  const lensId = thinkingModeToLensId(activeLens);
  const blocked = lensId === null;
  const sending = thread.status === "sending";
  const canSend = draft.trim().length > 0 && !sending && !blocked;
  // The document this thread started with wins over the currently open one.
  const shownTitle = thread.pinnedDocTitle ?? docTitle;

  // Listen for engine config changes from modal
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<EngineConfig>;
      if (custom.detail) setEngineConfig(custom.detail);
      else setEngineConfig(readEngineConfig());
    };
    window.addEventListener("yentellect:engine-changed", handler);
    return () => window.removeEventListener("yentellect:engine-changed", handler);
  }, []);

  // Auto-resize the composer (min 44px -> max 180px).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 180)}px`;
  }, [draft]);

  // Scroll to bottom only when already near bottom, or while sending.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 300;
    if (isNearBottom || sending) {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }, [thread.turns, thread.connections, sending, reduceMotion]);

  async function handleSend(): Promise<void> {
    if (!canSend) return;
    const ok = await thread.send(draft);
    if (ok) setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <section
      id="pane-lens"
      data-region="lens"
      aria-label="Lens panel"
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)] border-l border-[var(--border)] relative"
    >
      {/* 1. Single Unified Header Bar (No stacked lines or redundant badges) */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-[var(--border)]/70 bg-[var(--bg-1)]">
        {/* Left: Title + Mode Toggle Capsule */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xs font-semibold text-[var(--text)] tracking-tight shrink-0">
            Socratic Lens
          </span>

          <div
            role="tablist"
            aria-label="Lens mode"
            className="flex items-center p-0.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]/60"
          >
            {lenses.map((lens) => {
              const info = MODES[lens];
              const selected = lens === activeLens;
              return (
                <button
                  key={lens}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onSelect(lens)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all ${
                    selected
                      ? "bg-[var(--bg-2)] text-[var(--accent)] shadow-2xs font-semibold"
                      : "text-[var(--text-dim)] hover:text-[var(--text)]"
                  }`}
                >
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Actions: Model Pill + Connections Drawer Toggle + New Thread */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* AI Model & Engine Switcher Pill */}
          <button
            type="button"
            onClick={() => setModelModalOpen(true)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              engineConfig.target === "local"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium hover:bg-emerald-500/20"
                : "bg-[var(--bg-0)] text-[var(--text-dim)] border-[var(--border)]/60 hover:text-[var(--text)] hover:border-[var(--text-dim)]"
            }`}
            title="Configure AI Model & Engine (Cloud vs Local Machine)"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                engineConfig.target === "local" ? "bg-emerald-400 animate-pulse" : "bg-[var(--accent)]"
              }`}
            />
            <span className="truncate max-w-[85px]">
              {engineConfig.target === "local" ? (engineConfig.localModel || "Local AI") : "Cloud AI"}
            </span>
            <span className="text-[9px] opacity-60">▼</span>
          </button>

          {thread.keptCount > 0 && onToggleDrawer && (
            <button
              type="button"
              onClick={onToggleDrawer}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                drawerOpen
                  ? "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40 font-medium"
                  : "text-[var(--text-dim)] border-[var(--border)]/60 hover:text-[var(--text)] hover:border-[var(--text-dim)]"
              }`}
              title={drawerOpen ? "Hide connections drawer" : "Show connections drawer"}
            >
              <span>☍</span>
              <span>{thread.keptCount} kept</span>
            </button>
          )}

          {thread.turns.length > 0 && (
            <button
              type="button"
              onClick={() => thread.clear()}
              className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] px-1.5 py-0.5 rounded transition-colors flex items-center gap-1"
              title="Start a new thread"
            >
              <span>+ New</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Conversation Thread Area */}
      <div
        ref={scrollRef}
        aria-live="polite"
        className="flex-1 overflow-y-auto min-h-0 px-3.5 py-3 space-y-4"
      >
        {/* Floating Context Pill (Subtle, non-intrusive) */}
        {shownTitle && (
          <div className="flex justify-center pt-1 pb-1">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-0)]/90 text-[11px] text-[var(--text-dim)] border border-[var(--border)]/50 max-w-[92%] truncate shadow-2xs"
              title={shownTitle}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
              <span className="truncate">{shownTitle}</span>
            </div>
          </div>
        )}

        {/* Empty State with Clean Suggestions */}
        {thread.turns.length === 0 && (
          <div className="py-8 px-1 flex flex-col items-center text-center max-w-[340px] mx-auto">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-0)] border border-[var(--border)]/70 flex items-center justify-center text-[var(--accent)] mb-3 text-base shadow-2xs">
              {activeLens === "ANALOGICAL" ? "∿" : "⟳"}
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--text)] mb-1">
              {activeLens === "ANALOGICAL" ? "Analogical Lens" : "Systems Lens"}
            </h3>
            <p className="text-[11px] text-[var(--text-dim)] leading-relaxed mb-5">
              {activeLens === "ANALOGICAL"
                ? "Discover structural parallels and cross-domain mappings to test conceptual clarity."
                : "Analyze feedback loops, dependencies, and high-leverage systemic nodes."}
            </p>

            <div className="w-full flex flex-col gap-1.5 text-left">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]/60 font-medium px-1">
                Suggested questions
              </span>
              {(STARTER_PROMPTS[activeLens] ?? STARTER_PROMPTS.ANALOGICAL).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setDraft(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="group text-[12px] text-[var(--text-dim)] hover:text-[var(--text)] bg-[var(--bg-0)]/70 hover:bg-[var(--bg-2)] border border-[var(--border)]/50 hover:border-[var(--border)] rounded-xl px-3.5 py-2 text-left transition-all leading-snug cursor-pointer shadow-2xs flex items-center justify-between"
                >
                  <span className="truncate pr-2">{prompt}</span>
                  <span className="text-[var(--text-dim)]/40 group-hover:text-[var(--accent)] text-[11px] shrink-0 transition-colors">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {thread.turns.map((turn, i) => {
          const isUser = turn.role === "user";
          const cards = isUser
            ? []
            : thread.connections.filter((c) =>
                c.id.startsWith(`${i - 1}-`)
              );

          return (
            <Enter
              key={`turn-${i}`}
              reduce={!!reduceMotion}
              className={`flex flex-col gap-1.5 ${
                isUser ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`flex flex-col gap-1 ${
                  isUser ? "items-end max-w-[88%]" : "items-start max-w-[94%]"
                }`}
              >
                <div className="flex items-center gap-1.5 px-1">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold ${
                      isUser ? "text-[var(--text-dim)]/70" : "text-[var(--accent)]"
                    }`}
                  >
                    {isUser ? "You" : `◈ ${MODES[activeLens]?.label ?? "Lens"}`}
                  </span>
                </div>
                <div
                  className={
                    isUser
                      ? "bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-2xl rounded-tr-xs px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-[var(--text)] shadow-2xs"
                      : "bg-[var(--bg-0)] border border-[var(--border)]/60 rounded-2xl rounded-tl-xs px-3.5 py-2.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--text)] shadow-2xs"
                  }
                >
                  {turn.content}
                </div>
              </div>

              {!isUser &&
                cards.map((entry) => (
                  <ConnectionCard key={entry.id} entry={entry} thread={thread} />
                ))}
            </Enter>
          );
        })}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-0)] border border-[var(--border)]/60 rounded-2xl rounded-tl-xs px-3.5 py-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                <span className="text-[12px] text-[var(--text-dim)]">
                  Thinking through {MODES[activeLens]?.label.toLowerCase()} lens
                  {engineConfig.target === "local" ? ` (${engineConfig.localModel})` : ""}…
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error Strip */}
      {thread.error && (
        <div
          role="alert"
          className="mx-3 mb-2 flex items-start justify-between gap-2 text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--bg-0)] rounded-xl px-3 py-2 text-[12px] shrink-0"
        >
          <div className="flex flex-col gap-1">
            <span className="break-words">{thread.error}</span>
            {engineConfig.target === "local" && (
              <button
                type="button"
                onClick={() => setModelModalOpen(true)}
                className="text-[11px] underline text-left text-[var(--accent)] hover:opacity-80 transition-opacity"
              >
                Open AI Engine Settings →
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => thread.dismissError()}
            className="shrink-0 text-[var(--danger)] hover:text-[var(--text)] transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Degraded Fallback Strip */}
      {thread.lastResponseUsedFallback && !thread.error && (
        <div
          role="status"
          className="mx-3 mb-2 flex items-center justify-between gap-2 text-[var(--text-dim)] border border-[var(--border)] bg-[var(--bg-2)] rounded-xl px-3 py-2 text-[12px] shrink-0"
        >
          <span className="break-words">
            Couldn&apos;t structure a response — retry?
          </span>
          <button
            type="button"
            onClick={() => {
              thread.clear();
              thread.send(thread.turns[0]?.content ?? "");
            }}
            className="shrink-0 text-[10px] px-2 py-1 rounded-lg border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Clean Composer (No interior horizontal divider lines or noisy labels) */}
      <div className="border-t border-[var(--border)]/60 p-3 bg-[var(--bg-1)] shrink-0">
        {blocked && (
          <p className="mb-2 text-[11px] text-[var(--danger)] bg-[var(--bg-0)] px-2.5 py-1.5 rounded-lg border border-[var(--danger)]/30">
            This mode is not available yet — switch to Analogical or Systems.
          </p>
        )}

        <div className="rounded-xl border border-[var(--border)]/80 bg-[var(--bg-0)] focus-within:border-[var(--accent)]/80 focus-within:ring-1 focus-within:ring-[var(--accent)]/20 transition-all p-2.5 shadow-2xs">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              activeLens === "ANALOGICAL"
                ? "Ask about structural analogies, test a mapping, or probe a concept…"
                : "Explore systemic feedback loops, delays, or leverage points…"
            }
            rows={2}
            maxLength={2000}
            disabled={sending || blocked}
            aria-label="Message the lens"
            className="w-full resize-none bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)]/55 focus:outline-none disabled:opacity-50 min-h-[44px] leading-relaxed"
          />
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-[var(--text-dim)]/40 select-none">
              Shift+Enter for newline
            </span>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--bg-0)] font-semibold text-xs transition-all hover:opacity-90 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-2xs cursor-pointer"
              aria-label="Send message"
              title="Send message"
            >
              <span className="text-sm font-bold leading-none">↑</span>
            </button>
          </div>
        </div>
      </div>

      {/* Model & Engine Configuration Modal */}
      <ModelSettingsModal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
      />
    </section>
  );
}
