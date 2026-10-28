/**
 * Yentellect import — POST /api/import/article.
 *
 * Proxies and extracts clean reading text and metadata from journal articles,
 * research blogs, and scientific web publications.
 * Gated by Supabase auth.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const UrlSchema = z.object({
  url: z.string().url().max(2048),
});

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function cleanHtmlToText(html: string): {
  title: string;
  authors: string[];
  abstract: string | null;
  body: string;
  year: string | null;
} {
  // Extract title
  let title = "";
  const ogTitle =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
  if (ogTitle) {
    title = ogTitle[1];
  } else {
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleTag) title = titleTag[1];
  }
  title = collapse(
    title
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
  );

  // Extract author
  const authors: string[] = [];
  const authorMeta =
    /<meta[^>]+name=["'](?:author|article:author|citation_author)["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["'](?:author|article:author|citation_author)["']/i.exec(html);
  if (authorMeta) {
    authors.push(collapse(authorMeta[1]));
  }

  // Extract description / abstract
  let abstract: string | null = null;
  const descMeta =
    /<meta[^>]+property=["'](?:og:description|citation_abstract)["'][^>]+content=["']([^"']+)["']/i.exec(html) ||
    /<meta[^>]+name=["'](?:description|citation_abstract)["'][^>]+content=["']([^"']+)["']/i.exec(html);
  if (descMeta) {
    abstract = collapse(descMeta[1]);
  }

  // Extract year
  let year: string | null = null;
  const pubDate =
    /<meta[^>]+property=["'](?:article:published_time|og:published_time|citation_publication_date|citation_date)["'][^>]+content=["'](\d{4})[^"']*["']/i.exec(html) ||
    /<meta[^>]+name=["'](?:citation_publication_date|citation_date|date)["'][^>]+content=["'](\d{4})[^"']*["']/i.exec(html);
  if (pubDate) {
    year = pubDate[1];
  }

  // Extract article body
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");

  const articleMatch = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(cleaned);
  const mainMatch = /<main[^>]*>([\s\S]*?)<\/main>/i.exec(cleaned);
  const contentHtml = articleMatch ? articleMatch[1] : mainMatch ? mainMatch[1] : cleaned;

  let text = contentHtml
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n* $1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();

  if (text.length > 35000) {
    text = text.slice(0, 35000) + "\n\n*(Content truncated for workbench display)*";
  }

  return {
    title: title || "Imported Web Article",
    authors,
    abstract,
    body: text,
    year,
  };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid URL payload." }, { status: 400 });
  }
  const parsed = UrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid article URL." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to import articles." }, { status: 401 });
  }

  try {
    const res = await fetch(parsed.data.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Yentellect/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Could not fetch article (server responded with ${res.status}).` },
        { status: 502 }
      );
    }
    const html = await res.text();
    const extracted = cleanHtmlToText(html);

    return NextResponse.json({
      title: extracted.title,
      authors: extracted.authors,
      year: extracted.year,
      abstract: extracted.abstract,
      body: extracted.body,
      url: parsed.data.url,
      source: "web",
    });
  } catch (err) {
    console.error("[import/article] upstream request failed", err);
    return NextResponse.json(
      { error: "Could not fetch or parse that webpage. Check the URL and connection." },
      { status: 502 }
    );
  }
}

