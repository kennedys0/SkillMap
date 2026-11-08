import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { SkillSummary } from "@/src/contracts/api";
import { filterSkills } from "./filter";

const sampleSkills: SkillSummary[] = [
  {
    id: "skill-1",
    sourceId: "test",
    name: "React Frontend Architect",
    description: "Build accessible React and Next.js user interfaces with MUI.",
    relativePath: "frontend/react/SKILL.md",
    tags: ["react", "nextjs", "mui"],
  },
  {
    id: "skill-2",
    sourceId: "test",
    name: "Node.js Backend Engineer",
    description: "Implement secure REST APIs, validation, and scanner logic.",
    relativePath: "backend/node/SKILL.md",
    tags: ["nodejs", "typescript", "api"],
  },
  {
    id: "skill-3",
    sourceId: "test",
    name: "Playwright End-to-End Tester",
    description: "Automate browser testing and verify web application flows.",
    relativePath: "testing/playwright/SKILL.md",
    tags: ["testing", "e2e", "browser"],
  },
];

describe("filterSkills", () => {
  test("returns all skills when query is empty or only whitespace", () => {
    assert.deepEqual(filterSkills(sampleSkills, ""), sampleSkills);
    assert.deepEqual(filterSkills(sampleSkills, "   "), sampleSkills);
  });

  test("matches skills by name case-insensitively", () => {
    const results = filterSkills(sampleSkills, "react");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "skill-1");
  });

  test("matches skills by description", () => {
    const results = filterSkills(sampleSkills, "browser");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "skill-3");
  });

  test("matches skills by tag", () => {
    const results = filterSkills(sampleSkills, "typescript");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "skill-2");
  });

  test("matches skills by relative path", () => {
    const results = filterSkills(sampleSkills, "backend/node");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "skill-2");
  });

  test("supports multiple query terms (AND behavior)", () => {
    const results = filterSkills(sampleSkills, "react mui");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "skill-1");

    const none = filterSkills(sampleSkills, "react playwright");
    assert.equal(none.length, 0);
  });

  test("returns empty array when no skills match", () => {
    const results = filterSkills(sampleSkills, "nonexistent-topic");
    assert.equal(results.length, 0);
  });
});
