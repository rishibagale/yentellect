"use client";

/**
 * Yentellect workbench — lens thread state (Phase C).
 *
 * The thread model: the FIRST user message is the selection — the text the
 * lens reasons about — and it stays pinned for the whole thread. Every later
 * message is a follow-up sent as `userMessage` with the prior turns replayed
 * as history, capped to the schema's 30-turn window, so the model always sees
 * the conversation it already had. Document context is a placeholder note
 * until Stage 3 supplies a real document.
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
  send(text: string): Promise<boolean>;
  askWhy(connectionId: string): Promise<boolean>;
  keep(connectionId: string): void;
  discard(connectionId: string): void;
  dismissError(): void;
}

const DOC_CONTEXT = { title: "Untitled thought", kind: "note" };
const HISTORY_LIMIT = 30;
/** Covers every schema cap on user-supplied text: selection max 20000,
 *  userMessage max 10000 — so one clamp satisfies both whichever role it takes. */
const MAX_USER_CHARS = 10000;
const MAX_FIELD_CHARS = 300;
const NO_LENS_ERROR =
  "This lens has no backend yet — switch to Analogical or Systems.";
const FALLBACK_ERROR = "Lens request failed.";

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function useLensThread(opts: { lens: LensId | null }): LensThread {
  const [turns, setTurns] = useState<HistoryTurn[]>([]);
  const [connections, setConnections] = useState<ConnectionEntry[]>([]);
  const [status, setStatus] = useState<ThreadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [providerModel, setProviderModel] = useState<string | null>(null);

  const turnsRef = useRef<HistoryTurn[]>([]);
  const sendingRef = useRef(false);
  const lensRef = useRef(opts.lens);
  useEffect(() => {
    lensRef.current = opts.lens;
  }, [opts.lens]);

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
    const req: LensRequest = {
      lens,
      selection: isFirstSend ? content : prevTurns[0].content,
      doc: { title: DOC_CONTEXT.title, kind: DOC_CONTEXT.kind },
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
        })
      );
      commitTurns([...optimistic, reply]);
      setConnections((prev) => [...prev, ...entries]);
      setProviderModel(`${result.provider} · ${result.model}`);
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
    send,
    askWhy,
    keep,
    discard,
    dismissError,
  };
}
