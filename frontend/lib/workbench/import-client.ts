/**
 * Yentellect workbench — multi-platform paper & research import transport.
 *
 * Supports:
 * 1. arXiv: IDs and URLs
 * 2. DOI: Crossref works (Nature, Science, Springer, IEEE, ACM, etc.)
 * 3. bioRxiv & medRxiv: automatically parses preprints via DOI
 * 4. PubMed & PMC: medical & life science journals via Europe PMC API
 * 5. Web Articles: blogs, online journals, and research publications via /api/import/article
 * 6. File Uploads: PDF papers (/api/import/pdf), Markdown notes (.md), Text (.txt)
 * 7. Datasets: Tabular CSV/TSV and JSON datasets with automatic schema and preview extraction
 */

import type { DocKind } from "./db";

export interface ImportedDoc {
  id: string;
  title: string;
  authors: string[];
  year: string | null;
  abstract: string | null;
  source: "arxiv" | "crossref" | "pubmed" | "biorxiv" | "web" | "upload" | "dataset";
  url: string;
  kind?: DocKind;
  body?: string;
}

/** Thrown by import functions. `status` is HTTP status, or 0 for parsing/client errors. */
export class ImportError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ImportError";
    this.status = status;
  }
}

export type ImportTarget =
  | { kind: "arxiv"; id: string }
  | { kind: "doi"; id: string }
  | { kind: "pubmed"; id: string }
  | { kind: "web"; url: string };

const NETWORK_ERROR =
  "Couldn't reach the paper or article index — check your connection and try again.";
const FETCH_FALLBACK = "Couldn't fetch that research document — try again.";
const INSECURE = /api[ _-]?key|secret|token|bearer|authorization|LENS_[A-Z_]+/i;

const ARXIV_NEW = String.raw`\d{4}\.\d{4,5}`;
const ARXIV_OLD = String.raw`[a-z-]+(?:\.[A-Z]{2})?\/\d{7}`;
const ARXIV_ID = `(?:${ARXIV_NEW}|${ARXIV_OLD})`;

const ARXIV_URL = new RegExp(
  String.raw`^(?:https?:\/\/)?(?:www\.)?arxiv\.org\/(?:abs|pdf)\/(${ARXIV_ID})(?:v\d+)?(?:\.pdf)?\/?$`,
  "i"
);
const BIORXIV_URL =
  /^(?:https?:\/\/)?(?:www\.)?(?:biorxiv|medrxiv)\.org\/content\/(10\.\d{4,9}\/\S+?)(?:v\d+)?(?:\.full)?(?:\.pdf)?\/?$/i;
const PUBMED_URL = /^(?:https?:\/\/)?(?:www\.)?pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)\/?/i;
const PMC_URL = /^(?:https?:\/\/)?(?:www\.)?ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)\/?/i;
const PUBMED_BARE = /^(?:pmid:?\s*)(\d{6,9})$/i;
const PMC_BARE = /^(PMC\d+)$/i;

const DOI_URL = /^(?:https?:\/\/)?(?:www\.)?doi\.org\/(10\.\d{4,9}\/\S+)/i;
const DOI_BARE = /^10\.\d{4,9}\/\S+$/;
const ARXIV_BARE = new RegExp(String.raw`^(${ARXIV_ID})(?:v\d+)?$`, "i");
const GENERIC_HTTP_URL = /^https?:\/\/\S+/i;

const collapse = (text: string): string => text.replace(/\s+/g, " ").trim();
const trimTrailingPunct = (text: string): string => text.replace(/[).,;]+$/, "");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeServerError(body: unknown): string | null {
  if (!isRecord(body)) return null;
  const raw = body.error;
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text || text.includes("\n") || INSECURE.test(text)) return null;
  return text;
}

/**
 * Classify a pasted URL, identifier, or citation.
 */
export function classifyInput(raw: string): ImportTarget | null {
  const text = raw.trim();
  if (!text) return null;

  // 1. arXiv
  const arxivUrl = ARXIV_URL.exec(text);
  if (arxivUrl) return { kind: "arxiv", id: arxivUrl[1] };

  const arxivBare = ARXIV_BARE.exec(text);
  if (arxivBare) return { kind: "arxiv", id: arxivBare[1] };

  // 2. bioRxiv / medRxiv (contains DOI)
  const biorxivMatch = BIORXIV_URL.exec(text);
  if (biorxivMatch) return { kind: "doi", id: trimTrailingPunct(biorxivMatch[1]) };

  // 3. PubMed / PMC
  const pubmedUrl = PUBMED_URL.exec(text);
  if (pubmedUrl) return { kind: "pubmed", id: pubmedUrl[1] };

  const pmcUrl = PMC_URL.exec(text);
  if (pmcUrl) return { kind: "pubmed", id: pmcUrl[1] };

  const pubmedBare = PUBMED_BARE.exec(text);
  if (pubmedBare) return { kind: "pubmed", id: pubmedBare[1] };

  const pmcBare = PMC_BARE.exec(text);
  if (pmcBare) return { kind: "pubmed", id: pmcBare[1] };

  // 4. DOI
  const doiUrl = DOI_URL.exec(text);
  if (doiUrl) return { kind: "doi", id: trimTrailingPunct(doiUrl[1]) };

  const doiBare = trimTrailingPunct(text);
  if (DOI_BARE.test(doiBare)) return { kind: "doi", id: doiBare };

  // 5. Generic Web article / journal URL
  if (GENERIC_HTTP_URL.test(text)) {
    return { kind: "web", url: text };
  }

  return null;
}

/** Single entry point for URL and identifier import. */
export async function importPaper(raw: string): Promise<ImportedDoc> {
  const target = classifyInput(raw);
  if (!target) {
    throw new ImportError(
      "Enter a valid arXiv link, DOI (e.g. 10.1038/...), PubMed ID, or webpage/journal article URL.",
      0
    );
  }

  switch (target.kind) {
    case "arxiv":
      return importArxiv(target.id);
    case "doi":
      return importDoi(target.id);
    case "pubmed":
      return importPubMed(target.id);
    case "web":
      return importWebArticle(target.url);
  }
}

/* ------------------------------------------------------------------ */
/* arXiv                                                               */
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
    /* unreadable body */
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
    body: abstract || null ? `## Abstract\n\n${abstract}` : "",
    source: "arxiv",
    kind: "paper",
    url: entryUrl || `https://arxiv.org/abs/${id}`,
  };
}

/* ------------------------------------------------------------------ */
/* DOI (Crossref)                                                      */
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
    } catch {}
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
  const firstPart =
    Array.isArray(dateParts) && Array.isArray(dateParts[0]) ? dateParts[0][0] : undefined;
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
  const isBiorxiv = doi.startsWith("10.1101/");

  return {
    id: `doi:${doi}`,
    title,
    authors,
    year,
    abstract,
    body: abstract ? `## Abstract\n\n${abstract}` : "",
    source: isBiorxiv ? "biorxiv" : "crossref",
    kind: "paper",
    url: urlRaw || `https://doi.org/${doi}`,
  };
}

/* ------------------------------------------------------------------ */
/* PubMed & PMC (Europe PMC API)                                       */
/* ------------------------------------------------------------------ */

async function importPubMed(id: string): Promise<ImportedDoc> {
  const cleanId = id.trim();
  const isPmc = /^PMC\d+$/i.test(cleanId);
  const query = isPmc
    ? encodeURIComponent(cleanId)
    : `ext_id:${encodeURIComponent(cleanId.replace(/^pmid:?\s*/i, ""))}%20src:med`;

  let res: Response;
  try {
    res = await fetch(
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${query}&format=json&resultType=core`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );
  } catch {
    throw new ImportError(NETWORK_ERROR, 0);
  }

  if (!res.ok) {
    throw new ImportError("Could not fetch publication details from PubMed.", res.status);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new ImportError("Invalid response from PubMed.", 0);
  }

  const item = data.resultList?.result?.[0];
  if (!item) {
    throw new ImportError("No PubMed record found for that identifier.", 404);
  }

  const title = collapse(item.title ?? "");
  const authors =
    typeof item.authorString === "string"
      ? item.authorString
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean)
      : [];
  const year = item.pubYear ? String(item.pubYear) : null;
  const abstract = item.abstractText ? collapse(item.abstractText) : null;
  const pmid = item.pmid || cleanId.replace(/^pmid:?\s*/i, "");
  const url = item.doi
    ? `https://doi.org/${item.doi}`
    : `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

  return {
    id: `pubmed:${pmid}`,
    title: title || "PubMed Article",
    authors,
    year,
    abstract,
    body: abstract ? `## Abstract\n\n${abstract}` : "",
    source: "pubmed",
    kind: "paper",
    url,
  };
}

/* ------------------------------------------------------------------ */
/* Web Articles & Online Journals                                      */
/* ------------------------------------------------------------------ */

async function importWebArticle(url: string): Promise<ImportedDoc> {
  let res: Response;
  try {
    res = await fetch("/api/import/article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      cache: "no-store",
    });
  } catch {
    throw new ImportError(NETWORK_ERROR, 0);
  }

  if (res.status === 401) {
    throw new ImportError("Sign in to import web articles.", 401);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new ImportError(
      data?.error ?? "Could not import article from that URL.",
      res.status
    );
  }

  return {
    id: `web:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: data.title || "Web Article",
    authors: data.authors || [],
    year: data.year || null,
    abstract: data.abstract || null,
    body: data.body || (data.abstract ? `## Summary\n\n${data.abstract}` : ""),
    source: "web",
    kind: "article",
    url: data.url || url,
  };
}

/* ------------------------------------------------------------------ */
/* Local File Upload: PDF, Text, Datasets                              */
/* ------------------------------------------------------------------ */

export async function importFile(file: File): Promise<ImportedDoc> {
  const name = file.name;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    return importPdfFile(file);
  } else if (ext === "csv" || ext === "tsv") {
    const text = await readFileAsText(file);
    return parseTabularDataset(text, name);
  } else if (ext === "json") {
    const text = await readFileAsText(file);
    return parseJsonDataset(text, name);
  } else if (ext === "md" || ext === "txt") {
    const text = await readFileAsText(file);
    return parseTextDoc(text, name);
  } else {
    throw new ImportError(
      `Unsupported file type (.${ext}). Supported formats: PDF, Markdown (.md), Text (.txt), Datasets (.csv, .tsv, .json).`,
      0
    );
  }
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ImportError("Could not read file.", 0));
    reader.readAsText(file);
  });
}

async function importPdfFile(file: File): Promise<ImportedDoc> {
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch("/api/import/pdf", {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ImportError(NETWORK_ERROR, 0);
  }

  if (res.status === 401) {
    throw new ImportError("Sign in to upload PDF papers.", 401);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok) {
    throw new ImportError(data?.error ?? "Failed to parse PDF document.", res.status);
  }

  return {
    id: `pdf:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: data.title || file.name.replace(/\.pdf$/i, ""),
    authors: data.authors || [],
    year: data.year ?? null,
    abstract: data.abstract ?? null,
    body: data.body || "",
    source: "upload",
    kind: "paper",
    url: "",
  };
}

function parseTextDoc(text: string, fileName: string): ImportedDoc {
  const isMd = fileName.endsWith(".md");
  const headingMatch = /^#\s+(.+)$/m.exec(text);
  const title = headingMatch
    ? headingMatch[1].trim()
    : fileName.replace(/\.(md|txt)$/i, "").replace(/[_-]/g, " ");

  return {
    id: `note:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    authors: ["You"],
    year: String(new Date().getFullYear()),
    abstract: text.slice(0, 240).replace(/\s+/g, " ").trim(),
    body: text,
    source: "upload",
    kind: isMd ? "note" : "article",
    url: "",
  };
}

function splitRow(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ""));
  return result;
}

function parseTabularDataset(text: string, fileName: string): ImportedDoc {
  const isTsv =
    fileName.endsWith(".tsv") ||
    (!fileName.endsWith(".csv") && text.includes("\t") && !text.includes(","));
  const delimiter = isTsv ? "\t" : ",";

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new ImportError("Dataset file is empty.", 0);
  }

  const headers = splitRow(lines[0], delimiter);
  const totalRows = lines.length - 1;
  const previewRows = lines.slice(1, 11).map((line) => splitRow(line, delimiter));

  let markdown = `# Dataset: ${fileName}\n\n`;
  markdown += `**Source**: Local dataset (${isTsv ? "TSV" : "CSV"})\n`;
  markdown += `**Dimensions**: ${totalRows.toLocaleString()} rows × ${headers.length} attributes\n\n`;

  markdown += `### Feature Schema\n`;
  headers.forEach((h, idx) => {
    const sampleVal = previewRows[0]?.[idx] ?? "";
    const isNum = !isNaN(Number(sampleVal)) && sampleVal.trim() !== "";
    markdown += `- **\`${h || `col_${idx + 1}`}\`**: ${isNum ? "Numeric" : "Categorical / Text"}\n`;
  });

  markdown += `\n### Sample Data Preview (First ${Math.min(10, previewRows.length)} rows)\n\n`;
  markdown += `| ${headers.map((h) => h || "-").join(" | ")} |\n`;
  markdown += `| ${headers.map(() => "---").join(" | ")} |\n`;
  previewRows.forEach((row) => {
    const padded = headers.map((_, i) => (row[i] ?? "").replace(/\|/g, "\\|"));
    markdown += `| ${padded.join(" | ")} |\n`;
  });

  const abstract = `Dataset containing ${totalRows} records across ${headers.length} attributes (${headers.slice(0, 4).join(", ")}${headers.length > 4 ? "..." : ""}).`;

  return {
    id: `dataset:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "),
    authors: ["Dataset Upload"],
    year: String(new Date().getFullYear()),
    abstract,
    body: markdown,
    source: "dataset",
    kind: "dataset",
    url: "",
  };
}

function parseJsonDataset(text: string, fileName: string): ImportedDoc {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError("Invalid JSON format in dataset file.", 0);
  }

  let markdown = `# Dataset: ${fileName}\n\n`;
  let abstract = `JSON dataset (${fileName})`;

  if (Array.isArray(parsed)) {
    const total = parsed.length;
    abstract = `Array dataset with ${total.toLocaleString()} records.`;
    markdown += `**Format**: Array of ${total.toLocaleString()} items\n\n`;
    if (total > 0 && typeof parsed[0] === "object" && parsed[0] !== null) {
      const keys = Object.keys(parsed[0]);
      markdown += `### Attributes (${keys.length})\n`;
      keys.forEach((k) => {
        markdown += `- \`${k}\`: ${typeof (parsed[0] as any)[k]}\n`;
      });
      markdown += `\n### Sample Record (Item 1 of ${total})\n\`\`\`json\n${JSON.stringify(parsed[0], null, 2).slice(0, 2000)}\n\`\`\`\n`;
    }
  } else if (typeof parsed === "object" && parsed !== null) {
    const keys = Object.keys(parsed);
    abstract = `Structured object dataset with ${keys.length} top-level fields.`;
    markdown += `**Format**: Object with ${keys.length} top-level fields\n\n`;
    markdown += `### Top-Level Fields\n`;
    keys.forEach((k) => {
      const val = (parsed as any)[k];
      const type = Array.isArray(val) ? `Array (${val.length} items)` : typeof val;
      markdown += `- **\`${k}\`**: ${type}\n`;
    });
    markdown += `\n### Document Preview\n\`\`\`json\n${JSON.stringify(parsed, null, 2).slice(0, 2500)}\n\`\`\`\n`;
  }

  return {
    id: `dataset:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: fileName.replace(/\.json$/i, "").replace(/[_-]/g, " "),
    authors: ["Dataset Upload"],
    year: String(new Date().getFullYear()),
    abstract,
    body: markdown,
    source: "dataset",
    kind: "dataset",
    url: "",
  };
}
