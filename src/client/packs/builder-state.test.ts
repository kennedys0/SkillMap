import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { SkillSummary } from "@/src/contracts/api";
import {
  MAX_SAVED_SKILL_PACKS,
  MAX_SKILL_PACK_SELECTIONS,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import {
  addSelectionToPack,
  deleteSavedPack,
  isSkillSelectedInPack,
  removeSelectionFromPack,
  toggleSelectionInPack,
  updateSelectionRole,
  upsertSavedPack,
} from "./builder-state";
import { createSkillPack } from "./model";
import { reconcileSkillPackSelections } from "./reconcile";

const sampleSkill1: SkillSummary = {
  id: "skill-1",
  sourceId: "codex-src",
  name: "React Architect",
  description: "Build React UIs",
  relativePath: "frontend/react/SKILL.md",
  tags: ["react"],
};

const sampleSkill2: SkillSummary = {
  id: "skill-2",
  sourceId: "hermes-src",
  name: "Go Microservices",
  description: "Build Go services",
  relativePath: "backend/go/SKILL.md",
  tags: ["go"],
};

describe("builder-state", () => {
  test("adds selection to pack defaulting to unassigned role", () => {
    const pack = createSkillPack({ name: "My Pack" }, () => "test-uuid-1");
    const result = addSelectionToPack(pack, sampleSkill1);
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.pack.selections.length, 1);
    assert.deepEqual(result.pack.selections[0], {
      skillId: "skill-1",
      sourceId: "codex-src",
      relativePath: "frontend/react/SKILL.md",
      name: "React Architect",
      role: "unassigned",
    });
  });

  test("prevents adding duplicate selections to pack", () => {
    const pack = createSkillPack({ name: "My Pack" }, () => "test-uuid-1");
    const first = addSelectionToPack(pack, sampleSkill1);
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const second = addSelectionToPack(first.pack, sampleSkill1);
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.reason, "ALREADY_SELECTED");
  });

  test("enforces selection limit of 256 items per pack", () => {
    let pack = createSkillPack({ name: "Max Pack" }, () => "test-uuid-1");
    for (let i = 0; i < MAX_SKILL_PACK_SELECTIONS; i++) {
      pack = {
        ...pack,
        selections: [
          ...pack.selections,
          {
            skillId: `skill-${i}`,
            sourceId: "src",
            relativePath: `path/${i}/SKILL.md`,
            name: `Skill ${i}`,
            role: "unassigned",
          },
        ],
      };
    }
    assert.equal(pack.selections.length, MAX_SKILL_PACK_SELECTIONS);

    const result = addSelectionToPack(pack, sampleSkill1);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "LIMIT_REACHED");
  });

  test("removes selection from pack by exact reference", () => {
    const pack = createSkillPack({ name: "My Pack" }, () => "test-uuid-1");
    const added = addSelectionToPack(pack, sampleSkill1);
    assert.equal(added.ok, true);
    if (!added.ok) return;

    const removed = removeSelectionFromPack(added.pack, {
      skillId: sampleSkill1.id,
      sourceId: sampleSkill1.sourceId,
      relativePath: sampleSkill1.relativePath,
    });
    assert.equal(removed.selections.length, 0);
  });

  test("toggles selection in pack: adds if absent, removes if present", () => {
    const pack = createSkillPack({ name: "My Pack" }, () => "test-uuid-1");
    const res1 = toggleSelectionInPack(pack, sampleSkill1);
    assert.equal(res1.action, "added");
    assert.equal(res1.pack.selections.length, 1);
    assert.equal(isSkillSelectedInPack(res1.pack, sampleSkill1), true);

    const res2 = toggleSelectionInPack(res1.pack, sampleSkill1);
    assert.equal(res2.action, "removed");
    assert.equal(res2.pack.selections.length, 0);
    assert.equal(isSkillSelectedInPack(res2.pack, sampleSkill1), false);
  });

  test("updates selection role without affecting other selections", () => {
    let pack = createSkillPack({ name: "Roles Pack" }, () => "test-uuid-1");
    const r1 = addSelectionToPack(pack, sampleSkill1);
    assert.equal(r1.ok, true);
    if (!r1.ok) return;
    const r2 = addSelectionToPack(r1.pack, sampleSkill2);
    assert.equal(r2.ok, true);
    if (!r2.ok) return;

    pack = updateSelectionRole(
      r2.pack,
      {
        skillId: sampleSkill1.id,
        sourceId: sampleSkill1.sourceId,
        relativePath: sampleSkill1.relativePath,
      },
      "antigravity",
    );

    assert.equal(pack.selections[0].role, "antigravity");
    assert.equal(pack.selections[1].role, "unassigned");
  });

  test("upsertSavedPack updates existing pack by ID or adds new one up to 50", () => {
    const pack1 = createSkillPack({ name: "Pack 1" }, () => "uuid-1");
    const pack2 = createSkillPack({ name: "Pack 2" }, () => "uuid-2");

    let saved: SkillPackV1[] = [];
    const res1 = upsertSavedPack(saved, pack1);
    assert.equal(res1.ok, true);
    if (!res1.ok) return;
    saved = res1.packs;
    assert.equal(saved.length, 1);

    // Update pack1
    const updatedPack1 = { ...pack1, name: "Pack 1 Renamed" };
    const res2 = upsertSavedPack(saved, updatedPack1);
    assert.equal(res2.ok, true);
    if (!res2.ok) return;
    saved = res2.packs;
    assert.equal(saved.length, 1);
    assert.equal(saved[0].name, "Pack 1 Renamed");

    // Add pack2
    const res3 = upsertSavedPack(saved, pack2);
    assert.equal(res3.ok, true);
    if (!res3.ok) return;
    saved = res3.packs;
    assert.equal(saved.length, 2);

    // Test 50 limit
    const manyPacks: SkillPackV1[] = [];
    for (let i = 0; i < MAX_SAVED_SKILL_PACKS; i++) {
      manyPacks.push(createSkillPack({ name: `P${i}` }, () => `uuid-${i}`));
    }
    const newPack = createSkillPack({ name: "P-overflow" }, () => "uuid-new");
    const resOverflow = upsertSavedPack(manyPacks, newPack);
    assert.equal(resOverflow.ok, false);
    if (resOverflow.ok) return;
    assert.equal(resOverflow.reason, "LIMIT_REACHED");
  });

  test("deleteSavedPack removes pack by ID", () => {
    const pack1 = createSkillPack({ name: "Pack 1" }, () => "uuid-1");
    const pack2 = createSkillPack({ name: "Pack 2" }, () => "uuid-2");
    const saved = [pack1, pack2];

    const remaining = deleteSavedPack(saved, "uuid-1");
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].id, "uuid-2");
  });

  test("preserves pack selections when catalog rescans and marks stale skills unavailable", () => {
    let pack = createSkillPack({ name: "Preserved Pack" }, () => "uuid-1");
    const r1 = addSelectionToPack(pack, sampleSkill1);
    assert.equal(r1.ok, true);
    if (!r1.ok) return;
    const r2 = addSelectionToPack(r1.pack, sampleSkill2);
    assert.equal(r2.ok, true);
    if (!r2.ok) return;
    pack = r2.pack;

    // Rescan 1: both skills present
    const catalog1 = [sampleSkill1, sampleSkill2];
    const rec1 = reconcileSkillPackSelections(pack.selections, catalog1);
    assert.equal(rec1.length, 2);
    assert.equal(rec1[0].availability, "available");
    assert.equal(rec1[1].availability, "available");

    // Rescan 2: sampleSkill2 was deleted/missing from disk
    const catalog2 = [sampleSkill1];
    const rec2 = reconcileSkillPackSelections(pack.selections, catalog2);
    assert.equal(rec2.length, 2);
    assert.equal(rec2[0].availability, "available");
    assert.equal(rec2[1].availability, "unavailable");
    assert.equal(rec2[1].reason, "missing_or_changed");
    // Pack selections themselves were NOT mutated or dropped
    assert.equal(pack.selections.length, 2);
    assert.equal(pack.selections[1].name, "Go Microservices");
  });
});
