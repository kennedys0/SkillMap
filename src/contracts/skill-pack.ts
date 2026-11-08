export const SKILL_PACK_SCHEMA_VERSION = 1 as const;
export const SKILL_PACK_STORAGE_KEY = "mochi.skillmap.skill-packs.v1";

export const MAX_SAVED_SKILL_PACKS = 50;
export const MAX_SKILL_PACK_SELECTIONS = 256;
export const MAX_SKILL_PACK_IMPORT_BYTES = 256 * 1024;
export const MAX_SKILL_PACK_NAME_CHARACTERS = 120;
export const MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS = 2_000;
export const MAX_SKILL_PACK_SNAPSHOT_NAME_CHARACTERS = 120;
export const MAX_SKILL_PACK_RELATIVE_PATH_CHARACTERS = 1_024;
export const MAX_SKILL_PACK_SOURCE_ID_CHARACTERS = 64;

export const PACK_AGENT_ROLES = [
  "codex",
  "antigravity",
  "hermes",
  "unassigned",
] as const;

export type PackAgentRole = (typeof PACK_AGENT_ROLES)[number];

export interface SkillPackSelectionV1 {
  skillId: string;
  sourceId: string;
  relativePath: string;
  name: string;
  role: PackAgentRole;
}

export interface SkillPackV1 {
  schemaVersion: typeof SKILL_PACK_SCHEMA_VERSION;
  id: string;
  name: string;
  projectDescription: string;
  selections: SkillPackSelectionV1[];
}

export interface SkillPackStoreV1 {
  schemaVersion: typeof SKILL_PACK_SCHEMA_VERSION;
  packs: SkillPackV1[];
}
