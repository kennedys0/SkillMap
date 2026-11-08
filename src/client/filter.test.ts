import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { SkillSourceScanInfo, SkillSummary } from "@/src/contracts/api";
import { deriveCategories, filterSkills } from "./filter";

const sampleSources: SkillSourceScanInfo[] = [
  {
    id: "codex-src",
    label: "Codex Skills",
    agent: "codex",
    status: "ready",
    count: 2,
  },
  {
    id: "shared-src",
    label: "Shared Skills",
    agent: "shared",
    status: "ready",
    count: 1,
  },
  {
    id: "broken-hermes",
    label: "Hermes Tools",
    agent: "hermes",
    status: "invalid_root",
    count: 0,
  },
];

const sampleSkills: SkillSummary[] = [
  {
    id: "skill-1",
    sourceId: "codex-src",
    name: "React Frontend Architect",
    description:
      "Build accessible React and Next.js user interfaces with MUI and complex design systems for large scale applications.",
    relativePath: "frontend/react/SKILL.md",
    tags: ["react", "nextjs", "mui"],
  },
  {
    id: "skill-2",
    sourceId: "codex-src",
    name: "Node.js Backend Engineer",
    description: "Implement secure REST APIs, validation, and scanner logic.",
    relativePath: "backend/node/SKILL.md",
    tags: ["nodejs", "typescript", "api"],
  },
  {
    id: "skill-3",
    sourceId: "shared-src",
    name: "Playwright End-to-End Tester",
    description: "Automate browser testing and verify web application flows.",
    relativePath: "testing/playwright/SKILL.md",
    tags: ["testing", "e2e", "browser"],
  },
];

describe("deriveCategories", () => {
  test("computes accurate counts and statuses for all standard categories", () => {
    const categories = deriveCategories(sampleSkills, sampleSources);
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // All
    const allCat = catMap.get("all");
    assert.ok(allCat);
    assert.equal(allCat.skillCount, 3);
    assert.equal(allCat.configured, true);
    assert.equal(allCat.hasError, true); // because hermes is invalid_root

    // Codex
    const codexCat = catMap.get("codex");
    assert.ok(codexCat);
    assert.equal(codexCat.skillCount, 2);
    assert.equal(codexCat.configured, true);
    assert.equal(codexCat.statusSummary, "ready");

    // Shared
    const sharedCat = catMap.get("shared");
    assert.ok(sharedCat);
    assert.equal(sharedCat.skillCount, 1);
    assert.equal(sharedCat.configured, true);
    assert.equal(sharedCat.statusSummary, "ready");

    // Antigravity (not configured in sampleSources)
    const antiCat = catMap.get("antigravity");
    assert.ok(antiCat);
    assert.equal(antiCat.skillCount, 0);
    assert.equal(antiCat.configured, false);
    assert.equal(antiCat.statusSummary, "not_configured");

    // Hermes (configured but invalid_root)
    const hermesCat = catMap.get("hermes");
    assert.ok(hermesCat);
    assert.equal(hermesCat.skillCount, 0);
    assert.equal(hermesCat.configured, true);
    assert.equal(hermesCat.statusSummary, "invalid_root");
  });
});

describe("filterSkills", () => {
  test("returns all skills when query is empty and category is all", () => {
    assert.deepEqual(filterSkills(sampleSkills, ""), sampleSkills);
    assert.deepEqual(
      filterSkills(sampleSkills, "   ", { category: "all", sources: sampleSources }),
      sampleSkills,
    );
  });

  test("filters skills by agent category", () => {
    const codexSkills = filterSkills(sampleSkills, "", {
      category: "codex",
      sources: sampleSources,
    });
    assert.equal(codexSkills.length, 2);
    assert.ok(codexSkills.every((s) => s.sourceId === "codex-src"));

    const sharedSkills = filterSkills(sampleSkills, "", {
      category: "shared",
      sources: sampleSources,
    });
    assert.equal(sharedSkills.length, 1);
    assert.equal(sharedSkills[0].id, "skill-3");

    const antigravitySkills = filterSkills(sampleSkills, "", {
      category: "antigravity",
      sources: sampleSources,
    });
    assert.equal(antigravitySkills.length, 0);
  });

  test("matches skills by full description even if words appear at the end of a long text", () => {
    const results = filterSkills(sampleSkills, "scale applications");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "skill-1");
  });

  test("combines agent category filter with search query", () => {
    // Both query 'react' and category 'codex' match
    const match = filterSkills(sampleSkills, "react", {
      category: "codex",
      sources: sampleSources,
    });
    assert.equal(match.length, 1);
    assert.equal(match[0].id, "skill-1");

    // Query 'react' exists, but not in 'shared'
    const noMatch = filterSkills(sampleSkills, "react", {
      category: "shared",
      sources: sampleSources,
    });
    assert.equal(noMatch.length, 0);
  });

  test("matches skills by source label or agent", () => {
    const results = filterSkills(sampleSkills, "Codex Skills", {
      sources: sampleSources,
    });
    assert.equal(results.length, 2);
  });
});
