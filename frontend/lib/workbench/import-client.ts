/**
 * Yentellect workbench — paper import transport (Stage 4).
 *
 * `classifyInput` turns whatever the user pasted (arXiv URL, bare arXiv id,
 * doi.org URL, bare DOI) into a typed target; `importPaper` is the ONE place
 * the workbench fetches metadata. arXiv goes through the server route
 * (no CORS + polite User-Agent, DESIGN_RESEARCH §2.11/C1), DOI goes
 * browser-direct to Crossref (CORS `*`). Plain module, no "use client" —
 * only ever called from client components.
 *
 * Failures throw ImportError carrying a status (0 = network/parse/bad input).
 * Messages are fixed safe strings, or a route-provided `error` only when it
 * is a non-empty single line showing no sign of a key/secret/token: stacks,
 * env, and config text never reach the UI.
 */

export interface ImportedDoc {
  id: string; // "arxiv:1706.03762" | "doi:10.1145/3544548.3581234"
  title: string;
  authors: string[]; // "First Last"
  year: string | null;
  abstract: string | null;
  source: "arxiv" | "crossref";
  url: string;
}

/** Thrown by importPaper. `status` is the HTTP status, or 0 for network/parse/bad input. */
export class ImportError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ImportError";
    this.status = status;
  }
}

export type ImportTarget = { kind: "arxiv"; id: string } | { kind: "doi"; id: string };

const NETWORK_ERROR =
  "Couldn't reach the paper index — check your connection and try again.";
const FETCH_FALLBACK = "Couldn't fetch that paper — try again.";
const INSECURE = /api[ _-]?key|secret|token|bearer|authorization|LENS_[A-Z_]+/i;

const ARXIV_NEW = String.raw`\d{4}\.\d{4,5}`;
const ARXIV_OLD = String.raw`[a-z-]+(?:\.[A-Z]{2})?\/\d{7}`;
const ARXIV_ID = `(?:${ARXIV_NEW}|${ARXIV_OLD})`;

/** arXiv links with or without a scheme (the composer placeholder has none). */
const ARXIV_URL = new RegExp(
  String.raw`^(?:https?:\/\/)?(?:www\.)?arxiv\.org\/(?:abs|pdf)\/(${ARXIV_ID})(?:v\d+)?(?:\.pdf)?\/?$`,
  "i"
);
const DOI_URL = /^(?:https?:\/\/)?(?:www\.)?doi\.org\/(10\.\d{4,9}\/\S+)/i;
const DOI_BARE = /^10\.\d{4,9}\/\S+$/;
const ARXIV_BARE = new RegExp(String.raw`^(${ARXIV_ID})(?:v\d+)?$`, "i");

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();
const trimTrailingPunct = (text: string): string => text.replace(/[).,;]+$/, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The server's `error` field when it is safe to show, else null. */
function safeServerError(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const raw = body.error;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.includes("\n") || INSECURE.test(text)) return null;
  return text;
}

/**
 * Classify a pasted arXiv URL/id or DOI. Version suffixes are stripped;
 * trailing `).,;` is dropped from DOIs. Returns null when neither matches.
 */
export function classifyInput(raw: string): ImportTarget | null {
  const text = raw.trim();
  if (!text) return null;

  const arxivUrl = ARXIV_URL.exec(text);
  if (arxivUrl) return { kind: "arxiv", id: arxivUrl[1] };

  const doiUrl = DOI_URL.exec(text);
  if (doiUrl) return { kind: "doi", id: trimTrailingPunct(doiUrl[1]) };

  const doiBare = trimTrailingPunct(text);
  if (DOI_BARE.test(doiBare)) return { kind: "doi", id: doiBare };

  const arxivBare = ARXIV_BARE.exec(text);
  if (arxivBare) return { kind: "arxiv", id: arxivBare[1] };

  return null;
}

/** Single entry point: classify, then fetch metadata from the right source. */
export async function importPaper(raw: string): Promise<ImportedDoc> {
  const target = classifyInput(raw);
  if (!target) {
    throw new ImportError("That doesn't look like an arXiv URL or a DOI.", 0);
  }
  return target.kind === "arxiv" ? importArxiv(target.id) : importDoi(target.id);
}

/* ------------------------------------------------------------------ */
/* arXiv — via our own server route (no CORS upstream, C1)             */
/* ------------------------------------------------------------------ */

async function importArxiv(id: string): Promise<ImportedDoc> {
  let res: Response;
  try {
    res = await fetch("/api/import/arxiv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
      cache: "no-store",
    });
  } catch {
    throw new ImportError(NETWORK_ERROR, 0);
  }
  if (res.status === 401) {
    throw new ImportError("Sign in to import papers.", 401);
  }

  let body: unknown = null;
  let parsed = false;
  try {
    body = await res.json();
    parsed = true;
  } catch {
    /* unreadable body: fixed fallback below */
  }
  if (!res.ok) {
    throw new ImportError(safeServerError(body) ?? FETCH_FALLBACK, res.status);
  }
  if (!parsed || !isRecord(body) || typeof body.xml !== "string") {
    throw new ImportError(NETWORK_ERROR, 0);
  }

  const xml = new DOMParser().parseFromString(body.xml, "application/xml");
  const broken =
    xml.getElementsByTagName("parsererror").length > 0 ||
    xml.documentElement?.nodeName === "parsererror";
  const entry = broken ? null : xml.querySelector("entry");
  if (!entry) {
    throw new ImportError("No arXiv paper found for that identifier.", 404);
  }

  const title = collapse(entry.querySelector("title")?.textContent ?? "");
  if (!title) {
    throw new ImportError("No arXiv paper found for that identifier.", 404);
  }
  const authors = Array.from(entry.querySelectorAll("author > name"))
    .map((node) => collapse(node.textContent ?? ""))
    .filter(Boolean);
  const published = (entry.querySelector("published")?.textContent ?? "").trim();
  const abstract = collapse(entry.querySelector("summary")?.textContent ?? "");
  const entryUrl = collapse(entry.querySelector("id")?.textContent ?? "");

  return {
    id: `arxiv:${id}`,
    title,
    authors,
    year: /^\d{4}/.test(published) ? published.slice(0, 4) : null,
    abstract: abstract || null,
    source: "arxiv",
    url: entryUrl || `https://arxiv.org/abs/${id}`,
  };
}

/* ------------------------------------------------------------------ */
/* DOI — Crossref is CORS-enabled, so the browser calls it directly    */
/* ------------------------------------------------------------------ */

async function importDoi(doi: string): Promise<ImportedDoc> {
  let res: Response;
  try {
    res = await fetch("https://api.crossref.org/works/" + encodeURIComponent(doi), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new ImportError(NETWORK_ERROR, 0);
  }
  if (res.status === 404) {
    throw new ImportError("No DOI record found for that identifier.", 404);
  }
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* fixed fallback below */
    }
    throw new ImportError(safeServerError(body) ?? FETCH_FALLBACK, res.status);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new ImportError("That DOI record was unreadable.", 0);
  }

  const unreadable = new ImportError("That DOI record was unreadable.", 0);
  const message = isRecord(body) && isRecord(body.message) ? body.message : null;
  if (!message) throw unreadable;

  const titleRaw = Array.isArray(message.title) ? message.title[0] : undefined;
  const title = typeof titleRaw === "string" ? collapse(titleRaw) : "";
  if (!title) throw unreadable;

  const authors: string[] = [];
  if (Array.isArray(message.author)) {
    for (const candidate of message.author) {
      if (!isRecord(candidate)) continue;
      const given = typeof candidate.given === "string" ? candidate.given.trim() : "";
      const family = typeof candidate.family === "string" ? candidate.family.trim() : "";
      const name = [given, family].filter(Boolean).join(" ");
      if (name) authors.push(name);
    }
  }

  let year: string | null = null;
  const issued = isRecord(message.issued) ? message.issued : null;
  const dateParts = issued ? issued["date-parts"] : undefined;
  const firstPart = Array.isArray(dateParts) && Array.isArray(dateParts[0]) ? dateParts[0][0] : undefined;
  if (typeof firstPart === "number" || typeof firstPart === "string") {
    year = String(firstPart);
  }

  const rawAbstract = typeof message.abstract === "string" ? message.abstract : "";
  let abstract: string | null = null;
  if (rawAbstract.trim()) {
    const html = new DOMParser().parseFromString(rawAbstract, "text/html");
    abstract = collapse(html.body?.textContent ?? "") || null;
  }

  const urlRaw = typeof message.URL === "string" ? message.URL.trim() : "";
  return {
    id: `doi:${doi}`,
    title,
    authors,
    year,
    abstract,
    source: "crossref",
    url: urlRaw || `https://doi.org/${doi}`,
  };
}
