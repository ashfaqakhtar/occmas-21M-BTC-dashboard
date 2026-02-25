import { Redis } from "@upstash/redis";

function isValidUpstashValue(value?: string): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !normalized.includes("your_upstash_redis_url_here") &&
    !normalized.includes("your_upstash_redis_token_here")
  );
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Create a more robust Redis client with error handling
let redisClient: Redis;

try {
  if (!isValidUpstashValue(url) || !isValidUpstashValue(token)) {
    throw new Error("Redis not configured");
  }

  redisClient = new Redis({
    url,
    token,
    retry: {
      retries: 3,
      backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 1000),
    },
  });
} catch (error) {
  // Create a fallback Redis client that will gracefully fail
  redisClient = {
    get: async () => null,
    set: async () => null,
    ping: async () => {
      // throw new Error("Redis not available");
      ping: async () => true
    },
  } as unknown as Redis;
}

export const redis = redisClient;
