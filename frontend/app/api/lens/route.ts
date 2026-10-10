/**
 * Yentellect lens — POST /api/lens (Stage 5).
 *
 * The app middleware deliberately excludes /api/* from its session check, so
 * this route gates itself: no Supabase user → 401. An ungated LLM endpoint
 * would be an open abuse/cost vector.
 *
 * Bad request shape → 400. Provider output exhausted → the spec's fallback
 * { message, connections: [] } with usedFallback:true. Transport/config
 * failures → 502/500 (never masked as lens output).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { LensRequestSchema } from "@/lib/lens/schema";
import { runLens } from "@/lib/lens/run";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const parsed = LensRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lens request.", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use lenses." }, { status: 401 });
  }

  try {
    const result = await runLens(parsed.data);
    const res = NextResponse.json({
      message: result.response.message,
      connections: result.response.connections,
      usedFallback: result.usedFallback,
    });
    res.headers.set("X-Lens-Provider", result.provider);
    res.headers.set("X-Lens-Model", result.model);
    return res;
  } catch (err) {
    console.error("[lens] request failed", err);
    const msg = err instanceof Error ? err.message : "Lens request failed.";
    const insecure = /api[ _-]?key|secret|token|bearer|authorization|LENS_[A-Z_]+/i.test(msg);
    if (/LENS_|Unknown .*provider|requires/i.test(msg)) {
      return NextResponse.json({ error: "Lens provider is not configured." }, { status: 500 });
    }
    return NextResponse.json(
      { error: insecure ? "Lens provider error." : msg },
      { status: /LENS_|model|unknown/i.test(msg) ? 500 : 502 }
    );
  }
}
