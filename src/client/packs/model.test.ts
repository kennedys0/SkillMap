import assert from "node:assert/strict";
import test, { describe } from "node:test";

import type { SkillSummary } from "@/src/contracts/api";
import {
  createSkillPack,
  createSkillPackSelection,
  selectionReferenceKey,
} from "./model";

const duplicateNameSkills: SkillSummary[] = [
  {
    id: "111111111111111111111111",
    sourceId: "codex",
    name: "Project Planner",
    description: "Plans implementation work.",
    relativePath: "planning/SKILL.md",
    tags: ["planning"],
  },
  {
    id: "222222222222222222222222",
    sourceId: "shared",
    name: "Project Planner",
    description: "Plans shared implementation work.",
    relativePath: "planning/SKILL.md",
    tags: ["planning"],
  },
];

describe("skill pack model", () => {
  test("creates selections from catalog identity without inferring a role", () => {
    const selection = createSkillPackSelection(duplicateNameSkills[0]);

    assert.deepEqual(selection, {
      skillId: "111111111111111111111111",
      sourceId: "codex",
      relativePath: "planning/SKILL.md",
      name: "Project Planner",
      role: "unassigned",
    });
  });

  test("keeps same-name skills from different sources distinct", () => {
    const first = createSkillPackSelection(duplicateNameSkills[0]);
    const second = createSkillPackSelection(duplicateNameSkills[1]);

    assert.notEqual(selectionReferenceKey(first), selectionReferenceKey(second));
  });

  test("uses the injected UUID once and creates an empty v1 pack", () => {
    let calls = 0;
    const pack = createSkillPack(
      { name: "Release pack", projectDescription: "Ship the local tool." },
      () => {
        calls += 1;
        return "018f6a6b-5f16-7a22-9f84-123456789abc";
      },
    );

    assert.equal(calls, 1);
    assert.deepEqual(pack, {
      schemaVersion: 1,
      id: "018f6a6b-5f16-7a22-9f84-123456789abc",
      name: "Release pack",
      projectDescription: "Ship the local tool.",
      selections: [],
    });
  });
});
