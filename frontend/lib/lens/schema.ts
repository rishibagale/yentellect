/**
 * Yentellect lens — contracts (Stage 5).
 *
 * These zod schemas ARE the API contract from the lens spec. The TS types are
 * inferred from them, never written by hand, so types and runtime validation
 * cannot drift. The connection union is discriminated on `type` so an
 * `analogy` cannot carry a `SystemDetail` and vice versa.
 *
 * Works with zod v3 and v4 (only stable primitives are used).
 */
import { z } from "zod";

export const LensIdSchema = z.enum(["analogical", "systems"]);
export type LensId = z.infer<typeof LensIdSchema>;

export const LensProviderNameSchema = z.enum([
  "groq",
  "openai",
  "openrouter",
  "gemini",
  "deepseek",
  "anthropic",
  "custom",
  "mock",
]);
export type LensProviderName = z.infer<typeof LensProviderNameSchema>;

/* ------------------------------------------------------------------ */
/* Request                                                             */
/* ------------------------------------------------------------------ */

export const HistoryTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});
export type HistoryTurn = z.infer<typeof HistoryTurnSchema>;

export const LensRequestSchema = z.object({
  lens: LensIdSchema,
  selection: z.string().min(1).max(20000),
  doc: z.object({
    title: z.string().min(1).max(500),
    kind: z.string().min(1).max(120),
    abstract: z.string().max(5000).optional(),
  }),
  userField: z.string().min(1).max(300),
  history: z.array(HistoryTurnSchema).max(30).default([]),
  userMessage: z.string().max(10000).optional(),
});
export type LensRequest = z.infer<typeof LensRequestSchema>;

/* ------------------------------------------------------------------ */
/* Response                                                            */
/* ------------------------------------------------------------------ */

const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const MappingPairSchema = z.object({
  source: z.string().min(1).max(300),
  target: z.string().min(1).max(300),
});

export const AnalogyDetailSchema = z.object({
  mapping: z.array(MappingPairSchema).min(3).max(8),
  transfers: z.string().min(1).max(2000),
  breaks: z.string().min(1).max(2000),
  test: z.string().min(1).max(2000),
});
export type AnalogyDetail = z.infer<typeof AnalogyDetailSchema>;

export const SystemNodeKindSchema = z.enum(["stock", "flow", "variable", "boundary"]);
export const SystemNodeSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(200),
  kind: SystemNodeKindSchema,
});

export const SystemEdgeSchema = z.object({
  from: z.string().min(1).max(80),
  to: z.string().min(1).max(80),
  sign: z.enum(["+", "-"]),
  delay: z.boolean().optional(),
});

export const SystemLoopSchema = z.object({
  nodes: z.array(z.string().min(1).max(80)).min(2).max(10),
  kind: z.enum(["reinforcing", "balancing"]),
  note: z.string().min(1).max(1000),
});

export const SystemDetailSchema = z.object({
  nodes: z.array(SystemNodeSchema).min(1).max(10),
  edges: z.array(SystemEdgeSchema).max(24),
  loops: z.array(SystemLoopSchema).max(6),
  leverage: z.string().min(1).max(2000),
  assumptions: z.array(z.string().min(1).max(1000)).max(10).default([]),
  touchesUserModel: z.string().min(1).max(2000),
});
export type SystemDetail = z.infer<typeof SystemDetailSchema>;

const ConnectionBase = {
  targetLabel: z.string().min(1).max(200),
  targetField: z.string().max(200).optional(),
  summary: z.string().min(1).max(1000),
  confidence: ConfidenceSchema,
};

export const LensConnectionSchema = z.discriminatedUnion("type", [
  z.object({ ...ConnectionBase, type: z.literal("analogy"), detail: AnalogyDetailSchema }),
  z.object({ ...ConnectionBase, type: z.literal("system"), detail: SystemDetailSchema }),
]);
export type LensConnection = z.infer<typeof LensConnectionSchema>;

export const LensResponseSchema = z.object({
  message: z.string().min(1).max(12000),
  connections: z.array(LensConnectionSchema).max(3),
});
export type LensResponse = z.infer<typeof LensResponseSchema>;
