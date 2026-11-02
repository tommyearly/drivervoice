import { createHash } from "crypto";

interface Bucket {
  count: number;
  reset: number;
}

export function createMemoryRateLimiter() {
  const buckets = new Map<string, Bucket>();
  return {
    consume(key: string, limit: number, windowMs: number, now = Date.now()) {
      const current = buckets.get(key);
      if (!current || current.reset <= now) {
        buckets.set(key, { count: 1, reset: now + windowMs });
        return { ok: true, remaining: limit - 1 };
      }
      current.count += 1;
      return { ok: current.count <= limit, remaining: Math.max(0, limit - current.count) };
    },
  };
}

const shared = createMemoryRateLimiter();

export function consumeRate(key: string, limit = 8, windowMs = 60_000): { ok: boolean } {
  return shared.consume(key, limit, windowMs);
}

export function hashRateKey(value: string): string {
  const salt = process.env.RATE_LIMIT_SALT || "dev-salt";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}
