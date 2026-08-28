import { createClient } from "redis";

export type RateLimitStoreResult = { count: number; ttlMs: number };

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitStoreResult>;
}

const incrementScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("PTTL", KEYS[1]) }
`;

type RedisClient = ReturnType<typeof createClient>;
const globalForRateLimit = globalThis as unknown as {
  rateLimitRedisClient?: RedisClient;
  rateLimitRedisConnection?: Promise<RedisClient>;
  rateLimitMemoryStore?: MemoryRateLimitStore;
};

async function connectedRedisClient() {
  if (globalForRateLimit.rateLimitRedisClient?.isReady) return globalForRateLimit.rateLimitRedisClient;
  if (!globalForRateLimit.rateLimitRedisConnection) {
    const client = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: 3_000, reconnectStrategy: false },
    });
    client.on("error", (error) => console.error("Redis rate-limit error", error));
    globalForRateLimit.rateLimitRedisConnection = client.connect().then(() => {
      globalForRateLimit.rateLimitRedisClient = client;
      globalForRateLimit.rateLimitRedisConnection = undefined;
      return client;
    }).catch((error) => {
      globalForRateLimit.rateLimitRedisConnection = undefined;
      throw error;
    });
  }
  return globalForRateLimit.rateLimitRedisConnection;
}

export class RedisRateLimitStore implements RateLimitStore {
  async increment(key: string, windowMs: number) {
    const client = await connectedRedisClient();
    const result = await client.eval(incrementScript, {
      keys: [key],
      arguments: [String(windowMs)],
    });
    if (!Array.isArray(result) || result.length !== 2) throw new Error("Ungültige Redis-Antwort.");
    return { count: Number(result[0]), ttlMs: Math.max(1, Number(result[1])) };
  }
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();

  async increment(key: string, windowMs: number) {
    const now = Date.now();
    const existing = this.entries.get(key);
    const entry = !existing || existing.expiresAt <= now
      ? { count: 0, expiresAt: now + windowMs }
      : existing;
    entry.count += 1;
    this.entries.set(key, entry);
    return { count: entry.count, ttlMs: Math.max(1, entry.expiresAt - now) };
  }
}

export function defaultRateLimitStore(): RateLimitStore {
  if (process.env.REDIS_URL) return new RedisRateLimitStore();
  if (process.env.NODE_ENV === "production") throw new Error("REDIS_URL fehlt für das Rate-Limiting.");
  globalForRateLimit.rateLimitMemoryStore ??= new MemoryRateLimitStore();
  return globalForRateLimit.rateLimitMemoryStore;
}
