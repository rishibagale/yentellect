/**
 * Yentellect lens — output failure (Stage 5).
 *
 * Thrown when the model, after the spec's single retry, still has not
 * produced parseable, schema-valid output. Carries the last raw text so
 * run.ts and the eval harness can report honestly what went wrong.
 */
export class InvalidModelOutputError extends Error {
  readonly raw: string | null;
  readonly attempts: number;
  readonly reason: string;

  constructor(reason: string, raw: string | null, attempts: number) {
    super(`Lens model output unusable after ${attempts} attempt(s): ${reason}`);
    this.name = "InvalidModelOutputError";
    this.reason = reason;
    this.raw = raw;
    this.attempts = attempts;
  }
}
