import assert from "node:assert/strict";
import test, { describe } from "node:test";

import type { SkillSummary } from "@/src/contracts/api";
import type { SkillPackSelectionV1 } from "@/src/contracts/skill-pack";
import { reconcileSkillPackSelections } from "./reconcile";

const selection: SkillPackSelectionV1 = {
  skillId: "111111111111111111111111",
  sourceId: "codex",
  relativePath: "planning/SKILL.md",
  name: "Project Planner",
  role: "codex",
};

const exactSkill: SkillSummary = {
  id: selection.skillId,
  sourceId: selection.sourceId,
  relativePath: selection.relativePath,
  name: selection.name,
  description: "Plans implementation work.",
  tags: ["planning"],
};

describe("skill pack catalog reconciliation", () => {
  test("marks only an exact source-specific snapshot as available", () => {
    const result = reconcileSkillPackSelections([selection], [
      { ...exactSkill, id: "222222222222222222222222", sourceId: "shared" },
      exactSkill,
    ]);

    assert.deepEqual(result, [{ selection, availability: "available", skill: exactSkill }]);
  });

  for (const [name, candidate] of [
    ["missing entry", undefined],
    ["renamed skill", { ...exactSkill, name: "Project Planner v2" }],
    ["moved skill", { ...exactSkill, relativePath: "new-place/SKILL.md" }],
    ["source collision", { ...exactSkill, sourceId: "shared" }],
    [
      "unrelated same-name skill",
      { ...exactSkill, id: "999999999999999999999999", sourceId: "shared" },
    ],
  ] as const) {
    test(`does not remap a ${name}`, () => {
      const result = reconcileSkillPackSelections([selection], candidate ? [candidate] : []);

      assert.deepEqual(result, [
        { selection, availability: "unavailable", reason: "missing_or_changed" },
      ]);
    });
  }

  test("preserves saved selection order", () => {
    const second = {
      ...selection,
      skillId: "333333333333333333333333",
      sourceId: "shared",
    };
    const result = reconcileSkillPackSelections(
      [second, selection],
      [exactSkill, { ...exactSkill, id: second.skillId, sourceId: second.sourceId }],
    );

    assert.deepEqual(result.map((entry) => entry.selection.skillId), [second.skillId, selection.skillId]);
  });
});
