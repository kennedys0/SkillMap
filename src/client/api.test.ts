import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { MatchResponse, SkillsResponse } from "@/src/contracts/api";
import { ClientApiError, fetchSkills, matchSkills } from "./api";

describe("client api", () => {
  test("fetchSkills returns SkillsResponse on successful 200 response", async () => {
    const mockData: SkillsResponse = {
      data: {
        skills: [
          {
            id: "skill-1",
            sourceId: "codex",
            name: "Test Skill",
            description: "A test description",
            relativePath: "test/SKILL.md",
            tags: ["test"],
          },
        ],
        scan: {
          status: "ready",
          skillCount: 1,
          warningCount: 0,
          sources: [
            {
              id: "codex",
              label: "Codex skills",
              agent: "codex",
              status: "ready",
              count: 1,
            },
          ],
        },
      },
      warnings: [],
    };

    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(input, "/api/skills");
      assert.equal(init?.method, "GET");
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await fetchSkills(mockFetch);
    assert.deepEqual(result, mockData);
  });

  test("fetchSkills throws ClientApiError on 500 error with message", async () => {
    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Unable to scan local skills.",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    await assert.rejects(
      async () => {
        await fetchSkills(mockFetch);
      },
      (err: unknown) => {
        assert.ok(err instanceof ClientApiError);
        assert.equal(err.status, 500);
        assert.equal(err.code, "INTERNAL_ERROR");
        assert.equal(err.message, "Unable to scan local skills.");
        return true;
      },
    );
  });

  test("matchSkills sends correct payload and returns MatchResponse", async () => {
    const mockMatchData: MatchResponse = {
      data: {
        matches: [
          {
            skillId: "skill-1",
            score: 5,
            matchedTerms: ["react", "nextjs"],
            reason: "Matched name and description",
          },
        ],
        scan: {
          status: "ready",
          skillCount: 1,
          warningCount: 0,
          sources: [
            {
              id: "codex",
              label: "Codex skills",
              agent: "codex",
              status: "ready",
              count: 1,
            },
          ],
        },
      },
      warnings: [],
    };

    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(input, "/api/match");
      assert.equal(init?.method, "POST");
      const body = JSON.parse(init?.body as string);
      assert.deepEqual(body, { projectDescription: "Build a Next.js app" });

      return new Response(JSON.stringify(mockMatchData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const result = await matchSkills("Build a Next.js app", mockFetch);
    assert.deepEqual(result, mockMatchData);
  });

  test("matchSkills handles 422 validation error", async () => {
    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_REQUEST",
            message:
              "projectDescription must be the only field and contain 1 to 2000 characters.",
          },
        }),
        {
          status: 422,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    await assert.rejects(
      async () => {
        await matchSkills("", mockFetch);
      },
      (err: unknown) => {
        assert.ok(err instanceof ClientApiError);
        assert.equal(err.status, 422);
        assert.equal(err.code, "INVALID_REQUEST");
        return true;
      },
    );
  });

  test("matchSkills handles 429 rate limit error", async () => {
    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMITED",
            message: "Too many match requests. Try again shortly.",
          },
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    }) as typeof fetch;

    await assert.rejects(
      async () => {
        await matchSkills("Some text", mockFetch);
      },
      (err: unknown) => {
        assert.ok(err instanceof ClientApiError);
        assert.equal(err.status, 429);
        assert.equal(err.code, "RATE_LIMITED");
        return true;
      },
    );
  });
});
