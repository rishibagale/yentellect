"use client";

/**
 * Yentellect workbench — lens thread state (Phase C).
 *
 * The thread model: the FIRST user message is the selection — the text the
 * lens reasons about — and it stays pinned for the whole thread. Every later
 * message is a follow-up sent as `userMessage` with the prior turns replayed
 * as history, capped to the schema's 30-turn window, so the model always sees
 * the conversation it already had. The document is pinned on the FIRST send
 * only: importing a paper mid-thread must not retroactively change the
 * document the conversation already started with.
 *
 * The user turn is appended optimistically so the panel never feels laggy, and
 * ROLLED BACK when the call fails: a message the lens never answered must not
 * linger in the thread, or it would be replayed as history on the next send
 * and silently shift every subsequent request. `sendingRef` makes concurrent
 * sends impossible, so a rollback can only ever restore the exact snapshot.
 */
import { useEffect, useRef, useState } from "react";
import { postLens } from "./lens-client";
import type { HistoryTurn, LensConnection, LensId, LensRequest } from "@/lib/lens/schema";
import { readUserField } from "./storage";

export type ThreadStatus = "idle" | "sending" | "error";

export interface ConnectionEntry {
  id: string;
  connection: LensConnection;
  status: "open" | "kept" | "discarded";
  usedFallback: boolean;
}

export interface LensThread {
  turns: HistoryTurn[];
  connections: ConnectionEntry[];
  status: ThreadStatus;
  error: string | null;
  providerModel: string | null;
  userFieldEmpty: boolean;
  selectionWords: number;
  keptCount: number;
  /** Title of the document pinned at the first send; null when never sent or none open. */
  pinnedDocTitle: string | null;
  /** Whether the last assistant response used a fallback (invalid model output). */
  lastResponseUsedFallback: boolean;
  send(text: string): Promise<boolean>;
  askWhy(connectionId: string): Promise<boolean>;
  keep(connectionId: string): void;
  discard(connectionId: string): void;
  dismissError(): void;
  clear(): void;
}

type ThreadDoc = { title: string; kind: string; abstract?: string };

const DOC_CONTEXT: ThreadDoc = { title: "Untitled thought", kind: "note" };
const HISTORY_LIMIT = 30;
/** Covers every schema cap on user-supplied text: selection max 20000,
 *  userMessage max 10000 — so one clamp satisfies both whichever role it takes. */
const MAX_USER_CHARS = 10000;
const MAX_FIELD_CHARS = 300;
/** Abstract is capped at the schema's 5000-char doc.abstract maximum. */
const MAX_DOC_ABSTRACT = 5000;
const NO_LENS_ERROR = "This mode isn't available yet — switch to Analogical or Systems.";
const FALLBACK_ERROR = "Lens request failed.";

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function useLensThread(opts: {
  lens: LensId | null;
  doc?: ThreadDoc | null;
}): LensThread {
  const [turns, setTurns] = useState<HistoryTurn[]>([]);
  const [connections, setConnections] = useState<ConnectionEntry[]>([]);
  const [status, setStatus] = useState<ThreadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [providerModel, setProviderModel] = useState<string | null>(null);
  const [lastResponseUsedFallback, setLastResponseUsedFallback] = useState(false);

  const turnsRef = useRef<HistoryTurn[]>([]);
  const sendingRef = useRef(false);
  const lensRef = useRef(opts.lens);
  const docRef = useRef<ThreadDoc | null>(opts.doc ?? null);
  /** The document this thread is ABOUT: set once, on the first send only. */
  const pinnedDocRef = useRef<ThreadDoc | null>(null);
  useEffect(() => {
    lensRef.current = opts.lens;
  }, [opts.lens]);
  useEffect(() => {
    docRef.current = opts.doc ?? null;
  }, [opts.doc]);

  const commitTurns = (next: HistoryTurn[]): void => {
    turnsRef.current = next;
    setTurns(next);
  };

  async function send(text: string): Promise<boolean> {
    const content = text.trim().slice(0, MAX_USER_CHARS);
    if (!content) return false;
    if (sendingRef.current) return false;

    const storedField = readUserField().trim().slice(0, MAX_FIELD_CHARS);
    const lens = lensRef.current;
    if (lens === null) {
      setError(NO_LENS_ERROR);
      setStatus("error");
      return false;
    }

    const prevTurns = turnsRef.current;
    const isFirstSend = prevTurns.length === 0;
    if (isFirstSend && pinnedDocRef.current === null) {
      pinnedDocRef.current = docRef.current;
    }
    const pinned = pinnedDocRef.current ?? DOC_CONTEXT;
    const req: LensRequest = {
      lens,
      selection: isFirstSend ? content : prevTurns[0].content,
      doc: {
        title: pinned.title.slice(0, 500),
        kind: pinned.kind,
        ...(pinned.abstract
          ? { abstract: pinned.abstract.slice(0, MAX_DOC_ABSTRACT) }
          : {}),
      },
      userField: storedField || "not specified yet",
      history: isFirstSend ? [] : prevTurns.slice(1).slice(-HISTORY_LIMIT),
      ...(isFirstSend ? {} : { userMessage: content }),
    };

    sendingRef.current = true;
    setStatus("sending");
    setError(null);

    const pending: HistoryTurn = { role: "user", content };
    const optimistic: HistoryTurn[] = [...prevTurns, pending];
    const userTurnIndex = prevTurns.length;
    commitTurns(optimistic);

    try {
      const result = await postLens(req);
      const reply: HistoryTurn = {
        role: "assistant",
        content: result.response.message,
      };
      const entries: ConnectionEntry[] = result.response.connections.map(
        (connection: LensConnection, i: number) => ({
          id: `${userTurnIndex}-${i}`,
          connection,
          status: "open" as const,
          usedFallback: result.usedFallback,
        })
      );
      commitTurns([...optimistic, reply]);
      setConnections((prev) => [...prev, ...entries]);
      setProviderModel(`${result.provider} · ${result.model}`);
      setLastResponseUsedFallback(result.usedFallback);
      setStatus("idle");
      return true;
    } catch (err) {
      commitTurns(prevTurns);
      setError(err instanceof Error ? err.message : FALLBACK_ERROR);
      setStatus("error");
      return false;
    } finally {
      sendingRef.current = false;
    }
  }

  function askWhy(connectionId: string): Promise<boolean> {
    const entry = connections.find((c) => c.id === connectionId);
    if (!entry || entry.status !== "open") return Promise.resolve(false);
    return send(
      'Why does this connection hold? Explain the reasoning behind: "' +
        entry.connection.summary +
        '"'
    );
  }

  function keep(connectionId: string): void {
    setConnections((prev) =>
      prev.map((entry) => {
        if (entry.id !== connectionId) return entry;
        if (entry.status === "kept") return { ...entry, status: "open" as const };
        return { ...entry, status: "kept" as const };
      })
    );
  }

  function discard(connectionId: string): void {
    setConnections((prev) =>
      prev.map((entry) => {
        if (entry.id !== connectionId) return entry;
        return {
          ...entry,
          status: entry.status === "discarded" ? ("open" as const) : ("discarded" as const),
        };
      })
    );
  }

  function dismissError(): void {
    setError(null);
    setStatus((s) => (s === "error" ? "idle" : s));
  }

  /** Full reset: turns, connections, error, status, model, and the doc pin. */
  function clear(): void {
    commitTurns([]);
    setConnections([]);
    setError(null);
    setStatus("idle");
    setProviderModel(null);
    setLastResponseUsedFallback(false);
    pinnedDocRef.current = null;
  }

  const first =
    turns.length > 0 && turns[0].role === "user" ? turns[0] : null;

  return {
    turns,
    connections,
    status,
    error,
    providerModel,
    userFieldEmpty: readUserField().trim() === "",
    selectionWords: first ? countWords(first.content) : 0,
    keptCount: connections.filter((c) => c.status === "kept").length,
    pinnedDocTitle: pinnedDocRef.current ? pinnedDocRef.current.title : null,
    lastResponseUsedFallback,
    send,
    askWhy,
    keep,
    discard,
    dismissError,
    clear,
  };
}
