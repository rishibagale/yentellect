/**
 * Yentellect lens — mock provider (Stage 5).
 *
 * Used when no API keys are configured and for offline plumbing checks. It
 * returns a schema-VALID response with no connections, and says so in the
 * message — it never pretends to be a real lens. The eval harness refuses
 * to grade mock output (it would prove nothing).
 */
import { InvalidModelOutputError } from "../errors";
import type { CompleteOptions, CompleteResult, LensProvider } from "../provider";

const MOCK_MESSAGE = "Lens output isn't configured on this server yet.";

export function mockProvider(): LensProvider {
  return {
    name: "mock",
    async complete<T>(opts: CompleteOptions<T>): Promise<CompleteResult<T>> {
      const candidate = { message: MOCK_MESSAGE, connections: [] };
      const parsed = opts.schema.safeParse(candidate);
      if (!parsed.success) {
        throw new InvalidModelOutputError("mock payload failed schema", null, 1);
      }
      return {
        value: parsed.data,
        raw: JSON.stringify(candidate),
        provider: "mock",
        model: "mock",
        maskedKey: "n/a",
        attempts: 1,
        finishReason: "stop",
      };
    },
  };
}
