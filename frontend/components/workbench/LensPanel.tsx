/**
 * Yentellect workbench — Lens panel (Phase C, enhanced prominence).
 * Resizable, collapsible.
 *
 * Top to bottom:
 * 1. Header with "Socratic Lens Chat", status badge, and "New thread" action
 * 2. Segmented lens switcher (Analogical vs Systems + beta modes)
 * 3. Selection / Context bar (pinned document or thought origin)
 * 4. Interactive thread with role headers, message cards, and connection cards
 * 5. Welcoming empty state with curated starter prompts when empty
 * 6. Transport error and degraded fallback recovery strips
 * 7. Prominent multi-line composer with clear send CTA
 */
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { ThinkingMode } from "@/lib/modes";
import { MODES, visibleLenses } from "@/lib/modes";
import type { ConnectionEntry, LensThread } from "@/lib/workbench/lens-thread";
import { thinkingModeToLensId } from "@/lib/workbench/lens-client";

interface LensPanelProps {
  activeLens: ThinkingMode;
  onSelect: (lens: ThinkingMode) => void;
  betaModes: boolean;
  thread: LensThread;
  docTitle?: string | null;
}

const CARD_BTN =
  "text-[11px] px-2.5 py-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[var(--text-dim)] transition-colors";
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

/** One-line excerpt of the pinned selection, ~90 chars, whitespace flattened. */
function excerpt(text: string, max = 90): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

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
      initial={{ opacity: 0, y: 4 }}
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
      className={`w-full max-w-[72ch] border rounded-[var(--radius)] p-3 bg-[var(--bg-0)] shadow-sm transition-all ${
        isAnalogy
          ? "border-l-2 border-l-[var(--accent)] border-[var(--border)]"
          : "border-l-2 border-l-[#9d7bff] border-[var(--border)]"
      } ${discarded ? "opacity-45" : ""}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[var(--radius)] ${
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

      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]/60">
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
}: LensPanelProps) {
  const lenses = visibleLenses(betaModes);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const reduceMotion = useReducedMotion();

  const lensId = thinkingModeToLensId(activeLens);
  const blocked = lensId === null;
  const sending = thread.status === "sending";
  const canSend = draft.trim().length > 0 && !sending && !blocked;
  // The document this thread started with wins over the currently open one.
  const shownTitle = thread.pinnedDocTitle ?? docTitle;

  // Auto-resize the composer (min 48px -> max 180px).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 48), 180)}px`;
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
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)] border-l border-[var(--border)]"
    >
      {/* Top Header & Lens Switcher */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-0)] shrink-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text)] tracking-wide">
              Socratic Lens Chat
            </span>
            <span className="text-[10px] font-medium text-[var(--accent)] bg-[var(--accent)]/10 px-1.5 py-0.5 rounded-[var(--radius)]">
              Active
            </span>
          </div>
          {thread.turns.length > 0 && (
            <button
              type="button"
              onClick={() => thread.clear()}
              className="text-[11px] text-[var(--text-dim)] hover:text-[var(--text)] transition-colors flex items-center gap-1"
            >
              <span>+</span>
              <span>New thread</span>
            </button>
          )}
        </div>

        {/* Lens selection segmented tabs */}
        <div
          role="tablist"
          aria-label="Lens"
          className="flex gap-1.5 p-2 bg-[var(--bg-1)]"
        >
          {lenses.map((lens) => {
            const info = MODES[lens];
            const selected = lens === activeLens;
            const beta = lens !== "ANALOGICAL" && lens !== "SYSTEMS";
            return (
              <button
                key={lens}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => onSelect(lens)}
                className={`flex-1 rounded-[var(--radius)] px-3 py-1.5 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  selected
                    ? "bg-[var(--bg-2)] text-[var(--accent)] border border-[var(--border)] shadow-sm"
                    : "text-[var(--text-dim)] border border-transparent hover:text-[var(--text)] hover:bg-[var(--bg-2)]/50"
                }`}
              >
                <span>{info.label}</span>
                {beta && (
                  <span className="rounded-[var(--radius)] border border-[var(--border)] px-1 text-[9px] text-[var(--text-dim)]">
                    Beta
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection context bar */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] text-[11px] bg-[var(--bg-1)] text-[var(--text-dim)]"
        title={thread.turns.length > 0 ? thread.turns[0].content : undefined}
      >
        <span className="text-[var(--accent)] text-[12px]">●</span>
        <span className="truncate min-w-0 flex-1">
          {shownTitle === null ? (
            <>No document attached — your thoughts anchor this thread.</>
          ) : (
            <>
              <span className="text-[var(--text)] font-medium">{shownTitle}</span>
              {thread.turns.length > 0 && ` — "${excerpt(thread.turns[0].content)}"`}
            </>
          )}
        </span>
      </div>

      {/* Main Thread Area */}
      <div
        ref={scrollRef}
        aria-live="polite"
        className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-4"
      >
        {thread.turns.length === 0 && (
          <div className="py-8 px-2 flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-full bg-[var(--bg-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] mb-3 text-lg shadow-sm">
              {activeLens === "ANALOGICAL" ? "∿" : "⟳"}
            </div>
            <h3 className="text-[13px] font-semibold text-[var(--text)] mb-1">
              {activeLens === "ANALOGICAL" ? "Analogical Thinking Partner" : "Systems Thinking Partner"}
            </h3>
            <p className="text-[11px] text-[var(--text-dim)] max-w-[280px] leading-relaxed mb-5">
              {activeLens === "ANALOGICAL"
                ? "Explore deep structural isomorphs and cross-domain mappings to test conceptual clarity."
                : "Map feedback loops, delays, and identify non-obvious systemic leverage points."}
            </p>

            <div className="w-full flex flex-col gap-1.5 text-left">
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-medium px-1">
                Suggested prompts
              </span>
              {(STARTER_PROMPTS[activeLens] ?? STARTER_PROMPTS.ANALOGICAL).map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setDraft(prompt);
                    textareaRef.current?.focus();
                  }}
                  className="text-xs text-[var(--text)] bg-[var(--bg-0)] hover:bg-[var(--bg-2)] border border-[var(--border)] hover:border-[var(--text-dim)] rounded-[var(--radius)] px-3 py-2 text-left transition-colors flex items-center justify-between group shadow-sm"
                >
                  <span className="truncate">{prompt}</span>
                  <span className="text-[var(--text-dim)] group-hover:text-[var(--accent)] text-[11px] ml-2 shrink-0">
                    ↵
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {thread.turns.map((turn, i) => {
          const isUser = turn.role === "user";
          // Assistant at index t answers the user turn at t-1; ids are
          // `${userTurnIndex}-${i}` with userTurnIndex === t-1 (lens-thread.ts).
          const cards = isUser
            ? []
            : thread.connections.filter((c) =>
                c.id.startsWith(`${i - 1}-`)
              );

          return (
            <Enter
              key={`turn-${i}`}
              reduce={!!reduceMotion}
              className={`flex flex-col gap-2 ${
                isUser ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`flex flex-col gap-1 ${
                  isUser ? "items-end max-w-[92%]" : "items-start max-w-[96%]"
                }`}
              >
                <div className="flex items-center gap-1.5 px-1">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-medium ${
                      isUser ? "text-[var(--text-dim)]" : "text-[var(--accent)]"
                    }`}
                  >
                    {isUser ? "You" : `◈ ${MODES[activeLens]?.label ?? "Lens"}`}
                  </span>
                </div>
                <div
                  className={
                    isUser
                      ? "bg-[var(--bg-2)] border border-[var(--border)] rounded-[var(--radius)] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words text-[var(--text)] shadow-sm"
                      : "bg-[var(--bg-0)] border border-[var(--border)] rounded-[var(--radius)] px-3.5 py-2.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--text)] shadow-sm"
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
            <div className="bg-[var(--bg-0)] border border-[var(--border)] rounded-[var(--radius)] px-3.5 py-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                <span className="text-[12px] text-[var(--text-dim)]">
                  Thinking through {MODES[activeLens]?.label.toLowerCase()} lens…
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error strip — transport/config failures, never lens output. */}
      {thread.error && (
        <div
          role="alert"
          className="mx-3 mb-2 flex items-start justify-between gap-2 text-[var(--danger)] border border-[var(--danger)] bg-[var(--bg-0)] rounded-[var(--radius)] px-3 py-2 text-[12px] shrink-0"
        >
          <span className="break-words">{thread.error}</span>
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

      {/* Degraded strip — real-provider fallback (invalid model output). */}
      {thread.lastResponseUsedFallback && !thread.error && (
        <div
          role="status"
          className="mx-3 mb-2 flex items-center justify-between gap-2 text-[var(--text-dim)] border border-[var(--border)] bg-[var(--bg-2)] rounded-[var(--radius)] px-3 py-2 text-[12px] shrink-0"
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
            className="shrink-0 text-[10px] px-2 py-1 rounded-[var(--radius)] border border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)] hover:text-[var(--text)] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Prominent Composer */}
      <div className="border-t border-[var(--border)] p-3 bg-[var(--bg-0)] shrink-0">
        {thread.userFieldEmpty && (
          <p className="mb-2 text-[10px] text-[var(--text-dim)] bg-[var(--bg-1)] px-2.5 py-1.5 rounded-[var(--radius)] border border-[var(--border)]">
            Tip: Set your research area in <strong>Settings → Research</strong> so the lens can tailor connections.
          </p>
        )}

        {blocked && (
          <p className="mb-2 text-[11px] text-[var(--danger)] bg-[var(--bg-1)] px-2.5 py-1.5 rounded-[var(--radius)] border border-[var(--danger)]/30">
            This beta mode is not available yet — switch to Analogical or Systems (⌘1 / ⌘2).
          </p>
        )}

        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-2)] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/30 transition-all p-2 shadow-sm">
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
            className="w-full resize-none bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus:outline-none disabled:opacity-50 min-h-[48px] leading-relaxed"
          />
          <div className="flex items-center justify-between pt-1.5 border-t border-[var(--border)]/50 mt-1">
            <span className="text-[10px] text-[var(--text-dim)]">
              ↵ to send · Shift+↵ for newline
            </span>
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!canSend}
              className="px-3.5 py-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--bg-0)] font-medium text-[11px] transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm"
            >
              <span>Send</span>
              <span aria-hidden="true">↑</span>
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] text-[var(--text-dim)]">
            ⌘1 Analogical · ⌘2 Systems
          </span>
          {thread.providerModel && (
            <span
              className="text-[10px] text-[var(--text-dim)] truncate"
              title={thread.providerModel}
            >
              {thread.providerModel}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
