// Stage 2 library store: Dexie-backed docs + notes.
// Plain module (no "use client"): safe to import from components and hooks.
// Must NOT import lens-client.ts or lens-thread.ts.

import Dexie, { type EntityTable, liveQuery, type Observable } from "dexie";
import type { ImportedDoc } from "./import-client";

export type DocKind = "paper" | "concept" | "note";

export interface WorkDoc {
  id: string;
  kind: DocKind;
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  // Paper-only metadata (absent on concepts/notes)
  authors?: string[];
  year?: string | null;
  abstract?: string | null;
  source?: "arxiv" | "crossref";
  url?: string;
}

export const db = new Dexie("yentellect.library.v1") as Dexie & {
  docs: EntityTable<WorkDoc, "id">;
};

db.version(1).stores({
  docs: "id, kind, updatedAt",
});

export function makeDocId(kind: DocKind): string {
  return `${kind}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function putDoc(doc: WorkDoc): Promise<string> {
  const now = Date.now();
  const existing = await db.docs.get(doc.id);
  await db.docs.put({ ...doc, createdAt: existing?.createdAt ?? now, updatedAt: now });
  return doc.id;
}

export async function getDoc(id: string): Promise<WorkDoc | undefined> {
  return db.docs.get(id);
}

export async function deleteDoc(id: string): Promise<void> {
  pendingBodies.delete(id);
  await db.docs.delete(id);
}

export function liveDocs(): Observable<WorkDoc[]> {
  return liveQuery(async () => {
    const all = await db.docs.orderBy("updatedAt").reverse().toArray();
    return all;
  });
}

/* ------------------------------------------------------------------ */
/* Pending bodies                                                       */
/*                                                                     */
/* The editor writes on a debounce and flushes on unmount, so a body   */
/* can be newer than what Dexie has confirmed. A tab switch must never */
/* show (and then re-save) the older copy, so the newest body is kept  */
/* here. It is cleared only when the document itself is deleted — the  */
/* editor is the only writer of bodies, so the newest body is always   */
/* the right one.                                                      */
/* ------------------------------------------------------------------ */

const pendingBodies = new Map<string, string>();

/** The newest body for a doc that may not be persisted yet. */
export function pendingBody(id: string): string | undefined {
  return pendingBodies.get(id);
}

export function setPendingBody(id: string, body: string): void {
  pendingBodies.set(id, body);
}

/** Drop the pending body of a document that no longer exists. */
export function clearPendingBody(id: string): void {
  pendingBodies.delete(id);
}

export function importedDocToWorkDoc(doc: ImportedDoc): WorkDoc {
  return {
    id: doc.id,
    kind: "paper",
    title: doc.title,
    body: doc.abstract ?? "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    authors: doc.authors,
    year: doc.year,
    abstract: doc.abstract,
    source: doc.source,
    url: doc.url,
  };
}

/**
 * Store a freshly imported paper WITHOUT destroying work already done on it.
 * Re-importing the same paper refreshes the metadata but keeps the body the
 * user wrote, so an import is never a destructive act.
 */
export async function upsertImportedDoc(doc: ImportedDoc): Promise<WorkDoc> {
  const existing = await db.docs.get(doc.id);
  if (!existing) {
    const fresh = importedDocToWorkDoc(doc);
    await db.docs.put(fresh);
    return fresh;
  }
  const next: WorkDoc = {
    ...existing,
    title: doc.title,
    authors: doc.authors,
    year: doc.year,
    abstract: doc.abstract,
    source: doc.source,
    url: doc.url,
  };
  await db.docs.put(next);
  return next;
}
