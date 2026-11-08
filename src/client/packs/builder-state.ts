import type { SkillSummary } from "@/src/contracts/api";
import {
  MAX_SAVED_SKILL_PACKS,
  MAX_SKILL_PACK_SELECTIONS,
  type PackAgentRole,
  type SkillPackSelectionV1,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import { createSkillPackSelection, selectionReferenceKey } from "./model";

export function isSkillSelectedInPack(
  pack: SkillPackV1,
  skill: Pick<SkillSummary, "id" | "sourceId" | "relativePath">,
): boolean {
  const targetKey = selectionReferenceKey({
    skillId: skill.id,
    sourceId: skill.sourceId,
    relativePath: skill.relativePath,
  });
  return pack.selections.some((s) => selectionReferenceKey(s) === targetKey);
}

export type AddSelectionResult =
  | { ok: true; pack: SkillPackV1 }
  | { ok: false; reason: "ALREADY_SELECTED" | "LIMIT_REACHED" };

export function addSelectionToPack(
  pack: SkillPackV1,
  skill: SkillSummary,
  role: PackAgentRole = "unassigned",
): AddSelectionResult {
  if (isSkillSelectedInPack(pack, skill)) {
    return { ok: false, reason: "ALREADY_SELECTED" };
  }
  if (pack.selections.length >= MAX_SKILL_PACK_SELECTIONS) {
    return { ok: false, reason: "LIMIT_REACHED" };
  }
  const selection = createSkillPackSelection(skill, role);
  return {
    ok: true,
    pack: {
      ...pack,
      selections: [...pack.selections, selection],
    },
  };
}

export function removeSelectionFromPack(
  pack: SkillPackV1,
  selectionRef: Pick<
    SkillPackSelectionV1,
    "skillId" | "sourceId" | "relativePath"
  >,
): SkillPackV1 {
  const targetKey = selectionReferenceKey(selectionRef);
  return {
    ...pack,
    selections: pack.selections.filter(
      (s) => selectionReferenceKey(s) !== targetKey,
    ),
  };
}

export function toggleSelectionInPack(
  pack: SkillPackV1,
  skill: SkillSummary,
): { pack: SkillPackV1; action: "added" | "removed" | "limit_reached" } {
  if (isSkillSelectedInPack(pack, skill)) {
    return {
      pack: removeSelectionFromPack(pack, {
        skillId: skill.id,
        sourceId: skill.sourceId,
        relativePath: skill.relativePath,
      }),
      action: "removed",
    };
  }
  const addResult = addSelectionToPack(pack, skill, "unassigned");
  if (!addResult.ok) {
    return { pack, action: "limit_reached" };
  }
  return { pack: addResult.pack, action: "added" };
}

export function updateSelectionRole(
  pack: SkillPackV1,
  selectionRef: Pick<
    SkillPackSelectionV1,
    "skillId" | "sourceId" | "relativePath"
  >,
  newRole: PackAgentRole,
): SkillPackV1 {
  const targetKey = selectionReferenceKey(selectionRef);
  return {
    ...pack,
    selections: pack.selections.map((s) =>
      selectionReferenceKey(s) === targetKey ? { ...s, role: newRole } : s,
    ),
  };
}

export type UpsertPackResult =
  | { ok: true; packs: SkillPackV1[] }
  | { ok: false; reason: "LIMIT_REACHED" };

export function upsertSavedPack(
  savedPacks: readonly SkillPackV1[],
  pack: SkillPackV1,
): UpsertPackResult {
  const index = savedPacks.findIndex((p) => p.id === pack.id);
  if (index >= 0) {
    const updated = [...savedPacks];
    updated[index] = pack;
    return { ok: true, packs: updated };
  }
  if (savedPacks.length >= MAX_SAVED_SKILL_PACKS) {
    return { ok: false, reason: "LIMIT_REACHED" };
  }
  return { ok: true, packs: [...savedPacks, pack] };
}

export function deleteSavedPack(
  savedPacks: readonly SkillPackV1[],
  packId: string,
): SkillPackV1[] {
  return savedPacks.filter((p) => p.id !== packId);
}
