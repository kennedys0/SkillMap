import { isAbsolute } from "node:path";

import type {
  ScanConfigurationError,
  ScanConfigurationErrorCode,
} from "@/src/contracts/api";

export const MAX_SKILL_SOURCES = 16;

const MAX_TOKEN_LENGTH = 64;
const MAX_LABEL_LENGTH = 120;
const MAX_ROOT_LENGTH = 4_096;
const TOKEN_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F-\u009F]/u;
const SOURCE_KEYS = ["agent", "id", "label", "root"];

export interface SkillSourceConfig {
  id: string;
  label: string;
  agent: string;
  root: string;
}

export interface SourceEnvironment {
  SKILL_SOURCES_JSON?: string;
  SKILLS_ROOT?: string;
}

export type SourceResolution =
  | { status: "configured"; sources: SkillSourceConfig[] }
  | { status: "not_configured"; sources: [] }
  | {
      status: "invalid_configuration";
      sources: [];
      configurationError: ScanConfigurationError;
    };

function invalidConfiguration(
  code: ScanConfigurationErrorCode,
  message: string,
): SourceResolution {
  return {
    status: "invalid_configuration",
    sources: [],
    configurationError: { code, message },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= MAX_TOKEN_LENGTH &&
    TOKEN_PATTERN.test(value)
  );
}

function isLabel(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_LABEL_LENGTH &&
    value.trim() === value &&
    !CONTROL_CHARACTER_PATTERN.test(value)
  );
}

function isRoot(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_ROOT_LENGTH &&
    value.trim() === value &&
    isAbsolute(value)
  );
}

function parseSource(value: unknown): SkillSourceConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const keys = Object.keys(value).sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  if (
    keys.length !== SOURCE_KEYS.length ||
    keys.some((key, index) => key !== SOURCE_KEYS[index])
  ) {
    return undefined;
  }

  if (
    !isToken(value.id) ||
    !isLabel(value.label) ||
    !isToken(value.agent) ||
    !isRoot(value.root)
  ) {
    return undefined;
  }

  return {
    id: value.id,
    label: value.label,
    agent: value.agent,
    root: value.root,
  };
}

export function resolveSkillSources(
  environment: SourceEnvironment = process.env,
): SourceResolution {
  const encodedSources = environment.SKILL_SOURCES_JSON;
  if (encodedSources === undefined) {
    const legacyRoot = environment.SKILLS_ROOT ?? "";
    if (legacyRoot.trim().length === 0) {
      return { status: "not_configured", sources: [] };
    }
    return {
      status: "configured",
      sources: [
        {
          id: "legacy",
          label: "Legacy skills",
          agent: "shared",
          root: legacyRoot,
        },
      ],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(encodedSources);
  } catch {
    return invalidConfiguration(
      "INVALID_JSON",
      "SKILL_SOURCES_JSON must contain valid JSON.",
    );
  }

  if (
    !Array.isArray(parsed) ||
    parsed.length === 0 ||
    parsed.length > MAX_SKILL_SOURCES
  ) {
    return invalidConfiguration(
      "INVALID_SOURCE_LIST",
      `SKILL_SOURCES_JSON must be a non-empty array with at most ${MAX_SKILL_SOURCES} sources.`,
    );
  }

  const sources: SkillSourceConfig[] = [];
  const sourceIds = new Set<string>();
  for (const value of parsed) {
    const source = parseSource(value);
    if (!source) {
      return invalidConfiguration(
        "INVALID_SOURCE",
        "Each SKILL_SOURCES_JSON source must contain valid id, label, agent, and absolute root fields only.",
      );
    }
    if (sourceIds.has(source.id)) {
      return invalidConfiguration(
        "DUPLICATE_SOURCE_ID",
        "SKILL_SOURCES_JSON source ids must be unique.",
      );
    }
    sourceIds.add(source.id);
    sources.push(source);
  }

  return { status: "configured", sources };
}
