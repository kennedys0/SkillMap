import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SkillSummary } from "@/src/contracts/api";
import { matchSkills } from "@/src/server/match/matcher";

function skill(overrides: Partial<SkillSummary> = {}): SkillSummary {
  return {
    id: "skill-1",
    name: "React Builder",
    description: "Testing accessible interfaces",
    relativePath: "react-builder/SKILL.md",
    tags: ["API"],
    ...overrides,
  };
}

describe("matchSkills", () => {
  it("normalizes NFKC text, case, and punctuation", () => {
    const matches = matchSkills("Need ＲＥＡＣＴ, please!", [skill()]);

    assert.deepEqual(matches, [
      {
        skillId: "skill-1",
        score: 3,
        matchedTerms: ["react"],
        reason: "Matched terms — name: react.",
      },
    ]);
  });

  it("ignores stop words and generic project terms", () => {
    const matches = matchSkills(
      "Please help me build an application and create a project tool",
      [
        skill({
          name: "Application Tool",
          description: "Build and create a project",
          tags: [],
        }),
      ],
    );

    assert.deepEqual(matches, []);
  });

  it("returns no recommendation when meaningful terms do not overlap", () => {
    assert.deepEqual(matchSkills("Postgres migration indexing", [skill()]), []);
  });

  it("weights name, tag, and description terms once at their highest field", () => {
    const matches = matchSkills("Testing React API react", [skill()]);

    assert.deepEqual(matches, [
      {
        skillId: "skill-1",
        score: 6,
        matchedTerms: ["api", "react", "testing"],
        reason:
          "Matched terms — name: react; tags: api; description: testing.",
      },
    ]);
  });

  it("uses a term's highest field weight when it appears in several fields", () => {
    const matches = matchSkills("react", [
      skill({
        name: "React",
        description: "React interface patterns",
        tags: ["react"],
      }),
    ]);

    assert.equal(matches[0]?.score, 3);
    assert.equal(matches[0]?.reason, "Matched terms — name: react.");
  });

  it("sorts by descending score, then skill name, then ID", () => {
    const matches = matchSkills("react api", [
      skill({ id: "z-id", name: "Zulu", tags: ["react", "api"] }),
      skill({ id: "b-id", name: "Alpha", tags: ["react"] }),
      skill({ id: "a-id", name: "Alpha", tags: ["react"] }),
      skill({ id: "top", name: "Beta React", tags: ["api"] }),
    ]);

    assert.deepEqual(
      matches.map(({ skillId, score }) => ({ skillId, score })),
      [
        { skillId: "top", score: 5 },
        { skillId: "z-id", score: 4 },
        { skillId: "a-id", score: 2 },
        { skillId: "b-id", score: 2 },
      ],
    );
  });

  it("matches exact normalized terms without substring or stemming guesses", () => {
    const matches = matchSkills("tests reactive", [skill()]);

    assert.deepEqual(matches, []);
  });
});
