/**
 * Yentellect import — POST /api/import/arxiv (Stage 4).
 *
 * arXiv's API wants a descriptive User-Agent and has no CORS support
 * (DESIGN_RESEARCH §2.11 / C1), so the browser never calls it directly:
 * this route proxies one id_list query and hands the raw Atom XML back
 * for the client to parse.
 *
 * The app middleware excludes /api/*, so the route gates itself exactly
 * like the lens route: no Supabase user -> 401. Bad identifier -> 400,
 * unreachable upstream -> 502 (never a stack, key, or env string).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const ArxivIdSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9./-]+$/),
});

const UPSTREAM_ERROR = "Could not reach the paper index.";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid arXiv identifier." }, { status: 400 });
  }
  const parsed = ArxivIdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid arXiv identifier." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to import papers." }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://export.arxiv.org/api/query?id_list=" + encodeURIComponent(parsed.data.id),
      {
        headers: {
          "User-Agent": "Yentellect/1.0 (https://yentellect.com; research workbench)",
          Accept: "application/atom+xml",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: UPSTREAM_ERROR }, { status: 502 });
    }
    return NextResponse.json({ xml: await res.text() });
  } catch (err) {
    console.error("[import/arxiv] upstream request failed", err);
    return NextResponse.json({ error: UPSTREAM_ERROR }, { status: 502 });
  }
}
