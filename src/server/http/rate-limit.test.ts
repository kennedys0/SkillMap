import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createFixedWindowRateLimiter } from "@/src/server/http/rate-limit";

describe("createFixedWindowRateLimiter", () => {
  it("allows requests through the configured limit", () => {
    const limiter = createFixedWindowRateLimiter({
      limit: 2,
      windowMs: 1_000,
      now: () => 5_000,
    });

    assert.deepEqual(limiter.check(), {
      allowed: true,
      retryAfterSeconds: 0,
    });
    assert.deepEqual(limiter.check(), {
      allowed: true,
      retryAfterSeconds: 0,
    });
    assert.deepEqual(limiter.check(), {
      allowed: false,
      retryAfterSeconds: 1,
    });
  });

  it("opens a fresh window after the duration elapses", () => {
    let now = 5_000;
    const limiter = createFixedWindowRateLimiter({
      limit: 1,
      windowMs: 1_000,
      now: () => now,
    });

    assert.equal(limiter.check().allowed, true);
    assert.equal(limiter.check().allowed, false);
    now = 6_000;
    assert.deepEqual(limiter.check(), {
      allowed: true,
      retryAfterSeconds: 0,
    });
  });
});
