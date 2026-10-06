/**
 * Yentellect lens — public surface (Stage 5).
 *
 * Import from "@/lib/lens". Nothing outside this directory needs to know
 * about providers, registry, or prompt assembly.
 */
export type { LensId, LensRequest, LensResponse, LensConnection } from "./schema";
export type { AnalogyDetail, SystemDetail } from "./schema";
export type { LensProvider, CompleteOptions, CompleteResult, CompleteMeta } from "./provider";
export { getProvider } from "./provider";
export { runLens, type RunMeta, type RunResult } from "./run";
export { InvalidModelOutputError } from "./errors";
