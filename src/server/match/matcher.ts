import type { SkillMatch, SkillSummary } from "@/src/contracts/api";

const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "application",
  "are",
  "as",
  "at",
  "be",
  "build",
  "by",
  "create",
  "for",
  "from",
  "help",
  "i",
  "in",
  "is",
  "it",
  "make",
  "me",
  "my",
  "need",
  "of",
  "on",
  "or",
  "please",
  "project",
  "that",
  "the",
  "this",
  "to",
  "tool",
  "use",
  "using",
  "we",
  "with",
]);

type MatchField = "name" | "tags" | "description";

const FIELD_WEIGHTS: Record<MatchField, number> = {
  name: 3,
  tags: 2,
  description: 1,
};

interface RankedMatch extends SkillMatch {
  skillName: string;
}

function tokenize(value: string): Set<string> {
  const normalized = value.normalize("NFKC").toLocaleLowerCase("en-US");
  const terms = normalized.match(TOKEN_PATTERN) ?? [];
  return new Set(
    terms.filter((term) => term.length >= 2 && !STOP_WORDS.has(term)),
  );
}

function fieldForTerm(
  term: string,
  fields: Record<MatchField, Set<string>>,
): MatchField | undefined {
  if (fields.name.has(term)) {
    return "name";
  }
  if (fields.tags.has(term)) {
    return "tags";
  }
  if (fields.description.has(term)) {
    return "description";
  }
  return undefined;
}

function buildReason(matchesByField: Record<MatchField, string[]>): string {
  const parts: string[] = [];
  for (const field of ["name", "tags", "description"] as const) {
    if (matchesByField[field].length > 0) {
      parts.push(`${field}: ${matchesByField[field].join(", ")}`);
    }
  }
  return `Matched terms — ${parts.join("; ")}.`;
}

export function matchSkills(
  projectDescription: string,
  skills: SkillSummary[],
): SkillMatch[] {
  const projectTerms = [...tokenize(projectDescription)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  if (projectTerms.length === 0) {
    return [];
  }

  const ranked: RankedMatch[] = [];
  for (const skill of skills) {
    const fields: Record<MatchField, Set<string>> = {
      name: tokenize(skill.name),
      tags: tokenize(skill.tags.join(" ")),
      description: tokenize(skill.description),
    };
    const matchesByField: Record<MatchField, string[]> = {
      name: [],
      tags: [],
      description: [],
    };
    let score = 0;

    for (const term of projectTerms) {
      const field = fieldForTerm(term, fields);
      if (field) {
        matchesByField[field].push(term);
        score += FIELD_WEIGHTS[field];
      }
    }

    if (score > 0) {
      const matchedTerms = [
        ...matchesByField.name,
        ...matchesByField.tags,
        ...matchesByField.description,
      ].sort((left, right) => left.localeCompare(right, "en"));
      ranked.push({
        skillId: skill.id,
        score,
        matchedTerms,
        reason: buildReason(matchesByField),
        skillName: skill.name,
      });
    }
  }

  ranked.sort(
    (left, right) =>
      right.score - left.score ||
      left.skillName.localeCompare(right.skillName, "en", {
        sensitivity: "base",
      }) ||
      left.skillId.localeCompare(right.skillId, "en"),
  );

  return ranked.map(({ skillName: _skillName, ...match }) => match);
}
