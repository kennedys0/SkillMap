import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ScanResult } from "@/src/server/skills/scanner";
import { createGetSkillsHandler } from "@/app/api/skills/handler";

const scanResult: ScanResult = {
  skills: [
    {
      id: "skill-1",
      name: "React Builder",
      description: "Builds React interfaces",
      relativePath: "react/SKILL.md",
      tags: ["react"],
    },
  ],
  scan: { status: "ready", skillCount: 1, warningCount: 0 },
  warnings: [],
};

describe("GET /api/skills", () => {
  it("returns the shared skills response contract without caching", async () => {
    const GET = createGetSkillsHandler(async () => scanResult);

    const response = await GET();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), {
      data: {
        skills: scanResult.skills,
        scan: scanResult.scan,
      },
      warnings: [],
    });
  });

  it("returns a generic structured error for unexpected failures", async () => {
    const GET = createGetSkillsHandler(async () => {
      throw new Error("private path /home/person/skills");
    });

    const response = await GET();
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.deepEqual(body, {
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to scan local skills.",
      },
    });
    assert.equal(JSON.stringify(body).includes("/home/person"), false);
  });
});
