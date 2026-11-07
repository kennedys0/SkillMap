import { parseDocument } from "yaml";

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_TAG_LENGTH = 40;
const MAX_TAGS = 20;

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const SCRIPT_OR_STYLE_PATTERN =
  /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/giu;
const HTML_TAG_PATTERN = /<[^>]*>/gu;
const CONTROL_CHARACTER_PATTERN =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;
const WHITESPACE_PATTERN = /\s+/gu;

export interface ParsedSkillMetadata {
  name: string;
  description: string;
  tags: string[];
}

export type SkillMetadataErrorCode =
  | "MISSING_FRONTMATTER"
  | "INVALID_FRONTMATTER"
  | "INVALID_METADATA";

export class SkillMetadataError extends Error {
  constructor(
    public readonly code: SkillMetadataErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SkillMetadataError";
  }
}

function sanitizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(SCRIPT_OR_STYLE_PATTERN, " ")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(CONTROL_CHARACTER_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();
}

function parseRequiredText(
  record: Record<string, unknown>,
  field: "name" | "description",
  maxLength: number,
): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new SkillMetadataError(
      "INVALID_METADATA",
      `Skill metadata requires a string ${field}.`,
    );
  }

  const sanitized = sanitizeText(value);
  if (sanitized.length === 0 || sanitized.length > maxLength) {
    throw new SkillMetadataError(
      "INVALID_METADATA",
      `Skill metadata ${field} is empty or exceeds its limit.`,
    );
  }

  return sanitized;
}

function parseTags(value: unknown): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.length > MAX_TAGS) {
    throw new SkillMetadataError(
      "INVALID_METADATA",
      "Skill metadata tags must be a bounded string array.",
    );
  }

  const tags: string[] = [];
  const normalizedTags = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      throw new SkillMetadataError(
        "INVALID_METADATA",
        "Skill metadata tags must contain strings only.",
      );
    }

    const tag = sanitizeText(item);
    if (tag.length === 0 || tag.length > MAX_TAG_LENGTH) {
      throw new SkillMetadataError(
        "INVALID_METADATA",
        "A skill metadata tag is empty or exceeds its limit.",
      );
    }

    const normalizedTag = tag.toLocaleLowerCase("en-US");
    if (!normalizedTags.has(normalizedTag)) {
      normalizedTags.add(normalizedTag);
      tags.push(tag);
    }
  }

  return tags;
}

export function parseSkillMetadata(source: string): ParsedSkillMetadata {
  const match = FRONTMATTER_PATTERN.exec(source);
  if (!match) {
    throw new SkillMetadataError(
      "MISSING_FRONTMATTER",
      "SKILL.md must begin with YAML frontmatter.",
    );
  }

  let parsed: unknown;
  try {
    const document = parseDocument(match[1], { uniqueKeys: true });
    if (document.errors.length > 0) {
      throw document.errors[0];
    }
    parsed = document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new SkillMetadataError(
      "INVALID_FRONTMATTER",
      "SKILL.md frontmatter is not valid, alias-free YAML.",
    );
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new SkillMetadataError(
      "INVALID_METADATA",
      "SKILL.md frontmatter must be a metadata mapping.",
    );
  }

  const record = parsed as Record<string, unknown>;
  return {
    name: parseRequiredText(record, "name", MAX_NAME_LENGTH),
    description: parseRequiredText(
      record,
      "description",
      MAX_DESCRIPTION_LENGTH,
    ),
    tags: parseTags(record.tags),
  };
}
