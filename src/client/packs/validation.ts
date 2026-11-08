import {
  MAX_SKILL_PACK_IMPORT_BYTES,
  MAX_SKILL_PACK_NAME_CHARACTERS,
  MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS,
  MAX_SKILL_PACK_RELATIVE_PATH_CHARACTERS,
  MAX_SKILL_PACK_SELECTIONS,
  MAX_SKILL_PACK_SNAPSHOT_NAME_CHARACTERS,
  MAX_SKILL_PACK_SOURCE_ID_CHARACTERS,
  PACK_AGENT_ROLES,
  SKILL_PACK_SCHEMA_VERSION,
  type PackAgentRole,
  type SkillPackSelectionV1,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import { selectionReferenceKey } from "./model";

export interface SkillPackValidationIssue {
  code: string;
  path: string;
  message: string;
}

export type SkillPackValidationResult =
  | { ok: true; value: SkillPackV1 }
  | { ok: false; issues: SkillPackValidationIssue[] };

const PACK_FIELDS = ["id", "name", "projectDescription", "schemaVersion", "selections"];
const SELECTION_FIELDS = ["name", "relativePath", "role", "skillId", "sourceId"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SKILL_ID_PATTERN = /^[0-9a-f]{24}$/u;
const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/u;
const HTML_LIKE_PATTERN = /<\/?[a-z][^>]*>/iu;
const CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const SINGLE_LINE_CONTROL_PATTERN = /[\u0000-\u001f\u007f]/u;
const LIKELY_SECRET_PATTERNS = [
  /github_pat_[a-z0-9_]{20,}/iu,
  /gh[pousr]_[a-z0-9]{20,}/iu,
  /sk-[a-z0-9_-]{20,}/iu,
  /AKIA[0-9A-Z]{16}/u,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /(?:api[_-]?key|token|secret)\s*[:=]\s*\S{8,}/iu,
];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactFields(
  value: Record<string, unknown>,
  allowedFields: string[],
  path: string,
  issues: SkillPackValidationIssue[],
): boolean {
  const allowed = new Set(allowedFields);
  let exact = true;

  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push({ code: "UNKNOWN_FIELD", path: `${path}.${key}`, message: "Field is not allowed." });
      exact = false;
    }
  }

  for (const key of allowedFields) {
    if (!Object.hasOwn(value, key)) {
      issues.push({ code: "MISSING_FIELD", path: `${path}.${key}`, message: "Required field is missing." });
      exact = false;
    }
  }

  return exact;
}

function characterCount(value: string): number {
  return [...value].length;
}

function hasLikelySecret(value: string): boolean {
  return LIKELY_SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

function validateText(
  value: unknown,
  options: {
    path: string;
    label: string;
    code: string;
    maxCharacters: number;
    allowEmpty?: boolean;
    allowMultiline?: boolean;
  },
  issues: SkillPackValidationIssue[],
): value is string {
  if (typeof value !== "string") {
    issues.push({ code: options.code, path: options.path, message: `${options.label} must be text.` });
    return false;
  }

  if ((!options.allowEmpty && value.trim().length === 0) || value !== value.trim()) {
    issues.push({
      code: options.code,
      path: options.path,
      message: `${options.label} must be${options.allowEmpty ? "" : " non-empty and"} trimmed.`,
    });
    return false;
  }

  if (characterCount(value) > options.maxCharacters) {
    issues.push({ code: options.code, path: options.path, message: `${options.label} is too long.` });
    return false;
  }

  const controlPattern = options.allowMultiline ? CONTROL_PATTERN : SINGLE_LINE_CONTROL_PATTERN;
  if (controlPattern.test(value) || HTML_LIKE_PATTERN.test(value)) {
    issues.push({ code: "UNSAFE_TEXT", path: options.path, message: `${options.label} contains unsafe markup or control characters.` });
    return false;
  }

  if (hasLikelySecret(value)) {
    issues.push({ code: "LIKELY_SECRET", path: options.path, message: `${options.label} appears to contain a credential.` });
    return false;
  }

  return true;
}

function validateSelection(
  value: unknown,
  index: number,
  issues: SkillPackValidationIssue[],
): SkillPackSelectionV1 | undefined {
  const path = `$.selections[${index}]`;
  if (!isPlainRecord(value)) {
    issues.push({ code: "INVALID_OBJECT", path, message: "Selection must be a plain object." });
    return undefined;
  }

  if (!hasExactFields(value, SELECTION_FIELDS, path, issues)) {
    return undefined;
  }

  const validName = validateText(
    value.name,
    { path: `${path}.name`, label: "Skill name", code: "INVALID_NAME", maxCharacters: MAX_SKILL_PACK_SNAPSHOT_NAME_CHARACTERS },
    issues,
  );
  const validSkillId = typeof value.skillId === "string" && SKILL_ID_PATTERN.test(value.skillId);
  if (!validSkillId) {
    issues.push({ code: "INVALID_SKILL_ID", path: `${path}.skillId`, message: "Skill ID must be a 24-character lowercase hexadecimal token." });
  }

  const validSourceId =
    typeof value.sourceId === "string" &&
    value.sourceId.length <= MAX_SKILL_PACK_SOURCE_ID_CHARACTERS &&
    SOURCE_ID_PATTERN.test(value.sourceId);
  if (!validSourceId) {
    issues.push({ code: "INVALID_SOURCE_ID", path: `${path}.sourceId`, message: "Source ID must be a bounded lowercase token." });
  }

  const validPath =
    typeof value.relativePath === "string" &&
    value.relativePath.length > 0 &&
    value.relativePath.length <= MAX_SKILL_PACK_RELATIVE_PATH_CHARACTERS &&
    value.relativePath === value.relativePath.trim() &&
    !value.relativePath.startsWith("/") &&
    !/^[a-z]:\//iu.test(value.relativePath) &&
    !value.relativePath.includes("\\") &&
    !value.relativePath.includes("//") &&
    value.relativePath.endsWith("SKILL.md") &&
    value.relativePath.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..") &&
    !CONTROL_PATTERN.test(value.relativePath);
  if (!validPath) {
    issues.push({ code: "INVALID_RELATIVE_PATH", path: `${path}.relativePath`, message: "Path must be a bounded relative SKILL.md path without traversal." });
  }

  const validRole =
    typeof value.role === "string" && (PACK_AGENT_ROLES as readonly string[]).includes(value.role);
  if (!validRole) {
    issues.push({ code: "INVALID_ROLE", path: `${path}.role`, message: "Role is not supported." });
  }

  if (!validName || !validSkillId || !validSourceId || !validPath || !validRole) {
    return undefined;
  }

  return {
    skillId: value.skillId as string,
    sourceId: value.sourceId as string,
    relativePath: value.relativePath as string,
    name: value.name as string,
    role: value.role as PackAgentRole,
  };
}

export function validateSkillPack(value: unknown): SkillPackValidationResult {
  const issues: SkillPackValidationIssue[] = [];
  if (!isPlainRecord(value)) {
    return { ok: false, issues: [{ code: "INVALID_OBJECT", path: "$", message: "Manifest must be a plain object." }] };
  }

  if (!hasExactFields(value, PACK_FIELDS, "$", issues)) {
    return { ok: false, issues };
  }

  if (value.schemaVersion !== SKILL_PACK_SCHEMA_VERSION) {
    issues.push({ code: "UNSUPPORTED_SCHEMA", path: "$.schemaVersion", message: "Only skill pack schema version 1 is supported." });
  }

  const validId = typeof value.id === "string" && UUID_PATTERN.test(value.id);
  if (!validId) {
    issues.push({ code: "INVALID_ID", path: "$.id", message: "Pack ID must be a UUID." });
  }

  const validName = validateText(
    value.name,
    { path: "$.name", label: "Pack name", code: "INVALID_NAME", maxCharacters: MAX_SKILL_PACK_NAME_CHARACTERS },
    issues,
  );
  const validDescription = validateText(
    value.projectDescription,
    {
      path: "$.projectDescription",
      label: "Project description",
      code: "INVALID_PROJECT_DESCRIPTION",
      maxCharacters: MAX_SKILL_PACK_PROJECT_DESCRIPTION_CHARACTERS,
      allowEmpty: true,
      allowMultiline: true,
    },
    issues,
  );

  if (!Array.isArray(value.selections)) {
    issues.push({ code: "INVALID_SELECTIONS", path: "$.selections", message: "Selections must be an array." });
    return { ok: false, issues };
  }
  if (value.selections.length > MAX_SKILL_PACK_SELECTIONS) {
    issues.push({ code: "TOO_MANY_SELECTIONS", path: "$.selections", message: `A pack may contain at most ${MAX_SKILL_PACK_SELECTIONS} selections.` });
    return { ok: false, issues };
  }

  const selections = value.selections
    .map((selection, index) => validateSelection(selection, index, issues))
    .filter((selection): selection is SkillPackSelectionV1 => selection !== undefined);
  const seen = new Set<string>();
  for (let index = 0; index < selections.length; index += 1) {
    const key = selectionReferenceKey(selections[index]);
    if (seen.has(key)) {
      issues.push({ code: "DUPLICATE_SELECTION", path: `$.selections[${index}]`, message: "Exact skill reference is duplicated." });
    }
    seen.add(key);
  }

  if (issues.length > 0 || !validId || !validName || !validDescription) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      schemaVersion: SKILL_PACK_SCHEMA_VERSION,
      id: value.id as string,
      name: value.name as string,
      projectDescription: value.projectDescription as string,
      selections,
    },
  };
}

export function parseSkillPackJson(json: string): SkillPackValidationResult {
  if (new TextEncoder().encode(json).byteLength > MAX_SKILL_PACK_IMPORT_BYTES) {
    return {
      ok: false,
      issues: [{ code: "IMPORT_TOO_LARGE", path: "$", message: `Import exceeds ${MAX_SKILL_PACK_IMPORT_BYTES} UTF-8 bytes.` }],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, issues: [{ code: "MALFORMED_JSON", path: "$", message: "Import is not valid JSON." }] };
  }

  return validateSkillPack(parsed);
}
