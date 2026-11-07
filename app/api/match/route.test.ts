import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMatchHandler } from "@/app/api/match/handler";
import { createFixedWindowRateLimiter } from "@/src/server/http/rate-limit";
import type { ScanResult } from "@/src/server/skills/scanner";

const readyScan: ScanResult = {
  skills: [
    {
      id: "skill-1",
      name: "React Builder",
      description: "Testing accessible interfaces",
      relativePath: "react/SKILL.md",
      tags: ["API"],
    },
  ],
  scan: { status: "ready", skillCount: 1, warningCount: 0 },
  warnings: [],
};

function request(body: string, contentType = "application/json"): Request {
  return new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

function dependencies(scan: ScanResult = readyScan) {
  return {
    scan: async () => scan,
    limiter: createFixedWindowRateLimiter({
      limit: 30,
      windowMs: 60_000,
      now: () => 1_000,
    }),
  };
}

describe("POST /api/match", () => {
  it("validates, trims, scans, and returns deterministic matches", async () => {
    const POST = createMatchHandler(dependencies());

    const response = await POST(
      request(JSON.stringify({ projectDescription: "  Testing React API  " })),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      data: {
        matches: [
          {
            skillId: "skill-1",
            score: 6,
            matchedTerms: ["api", "react", "testing"],
            reason:
              "Matched terms — name: react; tags: api; description: testing.",
          },
        ],
        scan: readyScan.scan,
      },
      warnings: [],
    });
  });

  it("passes through non-ready scanner state with no fabricated matches", async () => {
    const unavailable: ScanResult = {
      skills: [],
      scan: { status: "not_configured", skillCount: 0, warningCount: 0 },
      warnings: [],
    };
    const POST = createMatchHandler(dependencies(unavailable));

    const response = await POST(
      request(JSON.stringify({ projectDescription: "React" })),
    );

    assert.deepEqual(await response.json(), {
      data: { matches: [], scan: unavailable.scan },
      warnings: [],
    });
  });

  it("rejects empty, too-long, wrongly typed, and extra request fields", async () => {
    const invalidBodies = [
      { projectDescription: "   " },
      { projectDescription: "x".repeat(2_001) },
      { projectDescription: 42 },
      { projectDescription: "React", extra: true },
    ];

    for (const body of invalidBodies) {
      const POST = createMatchHandler(dependencies());
      const response = await POST(request(JSON.stringify(body)));
      assert.equal(response.status, 422);
      assert.deepEqual(await response.json(), {
        error: {
          code: "INVALID_REQUEST",
          message:
            "projectDescription must be the only field and contain 1 to 2000 characters.",
        },
      });
    }
  });

  it("returns request parser errors as structured responses", async () => {
    const POST = createMatchHandler(dependencies());

    const response = await POST(request("{}", "text/plain"));

    assert.equal(response.status, 415);
    assert.deepEqual(await response.json(), {
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/json.",
      },
    });
  });

  it("enforces the process-local request limit", async () => {
    const POST = createMatchHandler({
      scan: async () => readyScan,
      limiter: createFixedWindowRateLimiter({
        limit: 1,
        windowMs: 60_000,
        now: () => 1_000,
      }),
    });
    const body = JSON.stringify({ projectDescription: "React" });

    assert.equal((await POST(request(body))).status, 200);
    const limited = await POST(request(body));

    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "60");
    assert.deepEqual(await limited.json(), {
      error: {
        code: "RATE_LIMITED",
        message: "Too many match requests. Try again shortly.",
      },
    });
  });

  it("returns a generic structured error for unexpected failures", async () => {
    const POST = createMatchHandler({
      ...dependencies(),
      scan: async () => {
        throw new Error("secret stack details");
      },
    });

    const response = await POST(
      request(JSON.stringify({ projectDescription: "React" })),
    );
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to match local skills.",
      },
    });
    assert.equal(JSON.stringify(body).includes("secret"), false);
  });
});
