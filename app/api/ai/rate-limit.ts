import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

type InMemoryCounter = {
  count: number;
  expiresAt: number;
};

const inMemoryCounters = new Map<string, InMemoryCounter>();

function isValidUpstashValue(value?: string): value is string {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    !normalized.includes("your_upstash_redis_url_here") &&
    !normalized.includes("your_upstash_redis_token_here")
  );
}

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!isValidUpstashValue(url) || !isValidUpstashValue(token)) {
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

// Rate limit configuration
type RateLimitConfig = {
  maxRequests: number; // Maximum requests per window
  windowInSeconds: number; // Time window in seconds
};

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = { maxRequests: 10, windowInSeconds: 60 }
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  // Get IP address from request headers
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") || "anonymous";

  // Create a unique key for this IP and endpoint
  const key = `rate-limit:ai:${ip}`;

  // Get current count and timestamp
  const now = Math.floor(Date.now() / 1000);
  const windowExpiry = now + config.windowInSeconds;
  const redisClient = getRedisClient();

  if (redisClient) {
    const count = await redisClient.incr(key);
    const ttl = await redisClient.ttl(key);
    const expiry = ttl > 0 ? Math.floor(Date.now() / 1000) + ttl : windowExpiry;

    if (count === 1) {
      await redisClient.expire(key, config.windowInSeconds);
    }

    const reset = expiry || windowExpiry;
    const remaining = Math.max(0, config.maxRequests - count);

    return {
      success: count <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      reset,
    };
  }

  // Fallback for local/dev when Redis is not configured.
  const existing = inMemoryCounters.get(key);
  const hasValidWindow = existing && existing.expiresAt > now;
  const count = hasValidWindow ? existing.count + 1 : 1;
  const expiresAt = hasValidWindow ? existing.expiresAt : windowExpiry;
  inMemoryCounters.set(key, { count, expiresAt });

  const remaining = Math.max(0, config.maxRequests - count);

  return {
    success: count <= config.maxRequests,
    limit: config.maxRequests,
    remaining,
    reset: expiresAt,
  };
}
