/**
 * Simple in-memory rate limiter for API endpoints
 *
 * Limits requests per IP address within a sliding time window.
 * Note: In serverless environments, this resets on cold starts.
 * For production, consider using @upstash/ratelimit with Redis.
 *
 * @module utils/rateLimit
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory store for rate limit tracking
 * Key: IP address, Value: request count and reset timestamp
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries periodically to prevent memory leaks
 * Runs every 60 seconds
 */
const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) {
    return;
  }

  lastCleanup = now;
  const keysToDelete: string[] = [];

  rateLimitStore.forEach((entry, ip) => {
    if (entry.resetAt < now) {
      keysToDelete.push(ip);
    }
  });

  keysToDelete.forEach((ip) => rateLimitStore.delete(ip));
}

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Timestamp when the rate limit resets (Unix ms) */
  resetAt: number;
  /** Seconds until rate limit resets */
  retryAfter: number;
}

/**
 * Default rate limit configuration
 * 10 requests per minute per IP
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Extract client IP from request headers
 *
 * Checks common headers set by proxies/load balancers:
 * 1. x-forwarded-for (standard proxy header)
 * 2. x-real-ip (nginx)
 * 3. cf-connecting-ip (Cloudflare)
 *
 * @param request - Next.js request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIp(request: Request): string {
  // Try x-forwarded-for first (may contain multiple IPs)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take the first IP (client's original IP)
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  // Try x-real-ip (nginx)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Try Cloudflare header
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp;
  }

  // Fallback
  return 'unknown';
}

/**
 * Check if a request is rate limited
 *
 * @param ip - Client IP address
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 *
 * @example
 * ```typescript
 * const ip = getClientIp(request);
 * const result = checkRateLimit(ip, { maxRequests: 10, windowMs: 60000 });
 *
 * if (!result.allowed) {
 *   return Response.json(
 *     { error: 'Too many requests' },
 *     {
 *       status: 429,
 *       headers: { 'Retry-After': String(result.retryAfter) }
 *     }
 *   );
 * }
 * ```
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): RateLimitResult {
  // Clean up expired entries periodically
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  // No existing entry or window expired - create new entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(ip, { count: 1, resetAt });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
      retryAfter: 0,
    };
  }

  // Existing entry within window - increment count
  entry.count += 1;

  const remaining = Math.max(0, config.maxRequests - entry.count);
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: 0,
  };
}

/**
 * Create rate limit response headers
 *
 * @param result - Rate limit check result
 * @param config - Rate limit configuration
 * @returns Headers object with rate limit info
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}
