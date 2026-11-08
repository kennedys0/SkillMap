export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  check(): RateLimitDecision;
}

export interface FixedWindowRateLimiterConfig {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export function createFixedWindowRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: FixedWindowRateLimiterConfig): RateLimiter {
  if (!Number.isInteger(limit) || limit <= 0 || windowMs <= 0) {
    throw new RangeError("Rate limiter values must be positive.");
  }

  let windowStartedAt = now();
  let requestCount = 0;

  return {
    check(): RateLimitDecision {
      const currentTime = now();
      if (currentTime >= windowStartedAt + windowMs) {
        windowStartedAt = currentTime;
        requestCount = 0;
      }

      if (requestCount >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((windowStartedAt + windowMs - currentTime) / 1_000),
          ),
        };
      }

      requestCount += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
