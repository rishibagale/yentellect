/**
 * Yentellect lens — orchestration (Stage 5).
 *
 * runLens assembles the call and enforces the spec's output discipline:
 * - validates the request with LensRequestSchema (caller bug → throw);
 * - exactly one provider call; on InvalidModelOutputError returns the spec's
 *   fallback { message, connections: [] } with a PLAIN message;
 * - clamps to three connections in code, not just in the prompt.
 */
import { InvalidModelOutputError } from "./errors";
import { buildSystemPrompt, JSON_SHAPE_EXAMPLE } from "./prompts";
import { getProvider, type LensChatMessage } from "./provider";
import {
  LensRequestSchema,
  LensResponseSchema,
} from "./schema";
import type { LensRequest, LensResponse } from "./schema";

export interface RunMeta {
  provider: string;
  model: string;
  maskedKey: string;
  attempts: number;
  finishReason?: string | null;
  usedFallback: boolean;
}

export interface RunResult extends RunMeta {
  response: LensResponse;
}

function fallbackMessage(lens: string): string {
  return lens === "analogical"
    ? "I could not form a structurally sound analogy for that selection, so I am offering none rather than a weak one. Try a narrower passage with a clearer mechanism, or tell me what you hoped it would connect to."
    : "I could not draw an honest system map from that selection, so I am returning none rather than inventing structure. Try a passage that describes parts interacting over time, or tell me what you hoped it would connect to.";
}

export async function runLens(input: LensRequest): Promise<RunResult> {
  const req = LensRequestSchema.parse(input); // caller bug → zod throws
  const system = buildSystemPrompt(req.lens, {
    userField: req.userField,
    docTitle: req.doc.title,
    isFollowUp: req.history.length > 0 || Boolean(req.userMessage),
  });

  const docBody = req.doc.body ? `\nDOCUMENT CONTENT:\n${req.doc.body.slice(0, 4000)}` : "";
  const selectionBlock =
    `DOCUMENT: "${req.doc.title}" (${req.doc.kind})` +
    (req.doc.abstract ? `\nABSTRACT: ${req.doc.abstract}` : "") +
    docBody +
    `\n\nSELECTED EXCERPT / FOCUS TO ANALYZE:\n${req.selection}` +
    `\n\nUSER FIELD: ${req.userField}`;

  const messages: LensChatMessage[] = [
    { role: "user", content: selectionBlock },
    ...req.history.map((t) => ({ role: t.role, content: t.content }) as LensChatMessage),
  ];
  if (req.userMessage) messages.push({ role: "user", content: req.userMessage });

  const provider = getProvider();
  try {
    const out = await provider.complete({
      system,
      messages,
      schema: LensResponseSchema,
      jsonShapeExample: JSON_SHAPE_EXAMPLE,
    });
    return {
      response: { ...out.value, connections: out.value.connections.slice(0, 3) },
      provider: out.provider,
      model: out.model,
      maskedKey: out.maskedKey,
      attempts: out.attempts,
      finishReason: out.finishReason,
      usedFallback: false,
    };
  } catch (err) {
    if (err instanceof InvalidModelOutputError) {
      console.warn(`[lens] output fallback after ${err.attempts} attempt(s): ${err.reason}`);
      return {
        response: { message: fallbackMessage(req.lens), connections: [] },
        provider: provider.name,
        model: "n/a",
        maskedKey: "n/a",
        attempts: err.attempts,
        finishReason: null,
        usedFallback: true,
      };
    }
    throw err; // transport/auth/config errors propagate — never masked as lens output
  }
}
