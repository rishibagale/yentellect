/**
 * Yentellect workbench — Lens panel (Phase C).
 * 360px default, resizable, collapsible.
 *
 * Top to bottom: the segmented lens switcher (unchanged from Stage 1), the
 * collapsed selection card (what the lens is actually reasoning about), the
 * thread with its connection cards, an error strip, and the composer.
 *
 * Connection cards are keyed by `${userTurnIndex}-${i}` (see lens-thread.ts):
 * the entries for the assistant turn sitting at index `t` are exactly the ones
 * whose id starts with `${t-1}-`, because that turn's user message was appended
 * at index `t-1` and `userTurnIndex` was captured before the reply landed.
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
}

const CARD_BTN =
  "text-[11px] px-2 py-1 rounded-[var(--radius)] border border-[var(--border)] hover:border-[var(--text-dim)] transition-colors";
const DIM_BTN = "text-[var(--text-dim)] hover:text-[var(--text)]";

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

  return (
    <div
      className={`w-full max-w-[72ch] border border-[var(--border)] rounded-[var(--radius)] p-2.5 bg-[var(--bg-1)] ${
        discarded ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-dim)]">
          {connection.type === "analogy" ? "Analogy" : "System"}
        </span>
        <span className="text-[10px] text-[var(--text-dim)]">
          {connection.confidence}
        </span>
        {kept && (
          <span className="text-[10px] text-[var(--accent)]">Kept</span>
        )}
        {discarded && (
          <span className="text-[10px] text-[var(--text-dim)]">
            Discarded
          </span>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-[var(--text)]">
        {connection.summary}
      </p>

      <div className="flex flex-wrap gap-1.5 mt-2">
        <button
          type="button"
          onClick={() => thread.keep(entry.id)}
          className={`${CARD_BTN} ${kept ? "text-[var(--accent)]" : DIM_BTN}`}
        >
          Keep
        </button>
        <button
          type="button"
          onClick={() => thread.discard(entry.id)}
          className={`${CARD_BTN} ${DIM_BTN}`}
        >
          Discard
        </button>
        {status === "open" && (
          <button
            type="button"
            disabled={thread.status === "sending"}
            onClick={() => void thread.askWhy(entry.id)}
            className={`${CARD_BTN} ${DIM_BTN} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Ask why
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

  // Auto-resize the composer (0 -> min(scrollHeight, 160)).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
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
      className="h-full flex flex-col overflow-hidden bg-[var(--bg-1)]"
    >
      <div
        role="tablist"
        aria-label="Lens"
        className="flex gap-1 p-2 border-b border-[var(--border)] shrink-0"
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
              className={`flex-1 rounded-[var(--radius)] px-2 py-1.5 text-xs transition-colors ${
                selected
                  ? "bg-[var(--bg-2)] text-[var(--text)] border border-[var(--border)]"
                  : "text-[var(--text-dim)] border border-transparent hover:text-[var(--text)]"
              }`}
            >
              {info.label}
              {beta && (
                <span className="ml-1 rounded-[var(--radius)] border border-[var(--border)] px-1 text-[10px] text-[var(--text-dim)]">
                  Beta
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection card — what the lens reasons about, one honest line. */}
      <div
        className="shrink-0 px-3 py-1.5 border-b border-[var(--border)] text-[10px] text-[var(--text-dim)] truncate"
        title={thread.turns.length > 0 ? thread.turns[0].content : undefined}
      >
        {thread.turns.length === 0 ? (
          <>No document — your first message becomes the selection.</>
        ) : (
          <>
            Thought · Untitled thought — {excerpt(thread.turns[0].content)}
          </>
        )}
      </div>

      {/* Thread */}
      <div
        ref={scrollRef}
        aria-live="polite"
        className="flex-1 overflow-y-auto min-h-0 px-3 py-3 space-y-3"
      >
        {thread.turns.length === 0 && (
          <p className="py-8 text-center text-[12px] text-[var(--text-dim)]">
            Ask a lens about a passage — or type the thought you had at 3am.
          </p>
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
                className={
                  isUser
                    ? "bg-[var(--bg-2)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 text-[13px] whitespace-pre-wrap break-words max-w-[92%] text-[var(--text)]"
                    : "bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed max-w-[72ch] text-[var(--text)]"
                }
              >
                {turn.content}
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
            <div className="bg-[var(--bg-1)] border border-[var(--border)] rounded-[var(--radius)] px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
                <span className="text-[12px] text-[var(--text-dim)]">
                  Thinking…
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
          className="mx-3 mb-2 flex items-start justify-between gap-2 text-[var(--danger)] border border-[var(--danger)] bg-[var(--bg-1)] rounded-[var(--radius)] px-3 py-2 text-[12px] shrink-0"
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

      {/* Composer */}
      <div className="border-t border-[var(--border)] p-2 shrink-0">
        {thread.userFieldEmpty && (
          <p className="mb-1.5 text-[10px] text-[var(--text-dim)]">
            Set your research area in Settings → Research so lenses can tailor
            connections.
          </p>
        )}

        {blocked && (
          <p className="mb-1.5 text-[11px] text-[var(--text-dim)]">
            Beta mode has no lens backend yet — switch to Analogical or Systems
            (Cmd+1 / Cmd+2).
          </p>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a thought…"
            rows={1}
            maxLength={2000}
            disabled={sending || blocked}
            aria-label="Message the lens"
            className="flex-1 resize-none bg-[var(--bg-2)] border border-[var(--border)] rounded-[var(--radius)] px-2.5 py-1.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className="px-3 py-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--bg-1)] text-[12px] transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[10px] text-[var(--text-dim)]">
            Enter to send · Shift+Enter for newline
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
