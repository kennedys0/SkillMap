import {
  MAX_SAVED_SKILL_PACKS,
  SKILL_PACK_SCHEMA_VERSION,
  SKILL_PACK_STORAGE_KEY,
  type SkillPackStoreV1,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import { validateSkillPack } from "./validation";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SkillPackStorageError {
  code:
    | "STORAGE_READ_FAILED"
    | "STORAGE_WRITE_FAILED"
    | "INVALID_STORED_DATA"
    | "INVALID_PACK"
    | "TOO_MANY_PACKS";
  message: string;
}

export type LoadSkillPacksResult =
  | { ok: true; packs: SkillPackV1[] }
  | { ok: false; error: SkillPackStorageError };

export type SaveSkillPacksResult =
  | { ok: true }
  | { ok: false; error: SkillPackStorageError };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validatePackCollection(value: unknown): LoadSkillPacksResult {
  if (!isPlainRecord(value)) {
    return invalidStoredData();
  }

  const keys = Object.keys(value).sort();
  if (
    keys.length !== 2 ||
    keys[0] !== "packs" ||
    keys[1] !== "schemaVersion" ||
    value.schemaVersion !== SKILL_PACK_SCHEMA_VERSION ||
    !Array.isArray(value.packs) ||
    value.packs.length > MAX_SAVED_SKILL_PACKS
  ) {
    return invalidStoredData();
  }

  const packs: SkillPackV1[] = [];
  const ids = new Set<string>();
  for (const pack of value.packs) {
    const result = validateSkillPack(pack);
    if (!result.ok || ids.has(result.value.id)) {
      return invalidStoredData();
    }
    ids.add(result.value.id);
    packs.push(result.value);
  }

  return { ok: true, packs };
}

function invalidStoredData(): LoadSkillPacksResult {
  return {
    ok: false,
    error: {
      code: "INVALID_STORED_DATA",
      message: "Saved skill packs are invalid or use an unsupported version.",
    },
  };
}

export function loadSkillPacks(storage: StorageLike): LoadSkillPacksResult {
  let stored: string | null;
  try {
    stored = storage.getItem(SKILL_PACK_STORAGE_KEY);
  } catch {
    return {
      ok: false,
      error: {
        code: "STORAGE_READ_FAILED",
        message: "Saved skill packs could not be read from this browser.",
      },
    };
  }

  if (stored === null) return { ok: true, packs: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored) as unknown;
  } catch {
    return invalidStoredData();
  }

  return validatePackCollection(parsed);
}

export function saveSkillPacks(
  storage: StorageLike,
  packs: readonly SkillPackV1[],
): SaveSkillPacksResult {
  if (packs.length > MAX_SAVED_SKILL_PACKS) {
    return {
      ok: false,
      error: {
        code: "TOO_MANY_PACKS",
        message: `At most ${MAX_SAVED_SKILL_PACKS} skill packs can be saved.`,
      },
    };
  }

  const validated: SkillPackV1[] = [];
  const ids = new Set<string>();
  for (const pack of packs) {
    const result = validateSkillPack(pack);
    if (!result.ok || ids.has(pack.id)) {
      return {
        ok: false,
        error: { code: "INVALID_PACK", message: "Only valid, uniquely identified skill packs can be saved." },
      };
    }
    ids.add(result.value.id);
    validated.push(result.value);
  }

  const store: SkillPackStoreV1 = {
    schemaVersion: SKILL_PACK_SCHEMA_VERSION,
    packs: validated,
  };

  try {
    storage.setItem(SKILL_PACK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    return {
      ok: false,
      error: {
        code: "STORAGE_WRITE_FAILED",
        message: "Skill packs could not be saved in this browser.",
      },
    };
  }

  return { ok: true };
}
