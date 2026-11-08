import type { SkillSummary } from "@/src/contracts/api";
import {
  SKILL_PACK_SCHEMA_VERSION,
  type PackAgentRole,
  type SkillPackSelectionV1,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";

export interface CreateSkillPackInput {
  name: string;
  projectDescription?: string;
}

type PackIdGenerator = () => string;

function generatePackId(): string {
  return globalThis.crypto.randomUUID();
}

export function createSkillPack(
  input: CreateSkillPackInput,
  generateId: PackIdGenerator = generatePackId,
): SkillPackV1 {
  return {
    schemaVersion: SKILL_PACK_SCHEMA_VERSION,
    id: generateId(),
    name: input.name,
    projectDescription: input.projectDescription ?? "",
    selections: [],
  };
}

export function createSkillPackSelection(
  skill: SkillSummary,
  role: PackAgentRole = "unassigned",
): SkillPackSelectionV1 {
  return {
    skillId: skill.id,
    sourceId: skill.sourceId,
    relativePath: skill.relativePath,
    name: skill.name,
    role,
  };
}

export function selectionReferenceKey(
  selection: Pick<
    SkillPackSelectionV1,
    "skillId" | "sourceId" | "relativePath"
  >,
): string {
  return JSON.stringify([
    selection.sourceId,
    selection.relativePath,
    selection.skillId,
  ]);
}
