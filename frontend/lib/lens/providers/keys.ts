/**
 * Yentellect lens — API key handling (Stage 5).
 *
 * Any key env var may hold several keys ("k1,k2,k3", newlines/semicolons also
 * accepted): callers rotate across them and fail over on 401/429/5xx, so a
 * dead or rate-limited key never kills a run by itself.
 *
 * Keys are NEVER logged in full — only a masked suffix for operator debugging.
 */

/** Split a raw env value into usable keys. Empty/missing → []. */
export function splitKeys(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

/** "sk-abc…xyz" → "…xyz". Safe to print. */
export function maskKey(key: string): string {
  const tail = key.slice(-4);
  return `…${tail}`;
}

/** Module-level cursor so consecutive calls start on different keys. */
let cursor = 0;

/**
 * Order the keys for one operation: rotate the starting position, keep the
 * rest in order for failover. The caller tries them in this sequence.
 */
export function orderKeysForAttempt(keys: string[]): string[] {
  if (keys.length === 0) return [];
  const start = cursor % keys.length;
  cursor = (cursor + 1) % Number.MAX_SAFE_INTEGER;
  return [...keys.slice(start), ...keys.slice(0, start)];
}

/** True for errors worth failing over to the next key: auth, rate, server. */
export function isFailoverable(err: unknown): boolean {
  const status =
    (err as { status?: number })?.status ?? (err as { statusCode?: number })?.statusCode;
  if (typeof status === "number") return status === 401 || status === 429 || status >= 500;
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate.?limit|5\d\d|timeout|ECONNRESET|fetch failed/i.test(msg);
}
