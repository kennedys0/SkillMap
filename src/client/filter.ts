import type { SkillSummary } from "@/src/contracts/api";

/**
 * Filters skills by search query against name, description, tags, and relativePath.
 * Case-insensitive, trimmed, and handles empty queries gracefully.
 */
export function filterSkills(
  skills: SkillSummary[],
  query: string,
): SkillSummary[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return skills;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  return skills.filter((skill) => {
    const name = skill.name.toLowerCase();
    const description = skill.description.toLowerCase();
    const relativePath = skill.relativePath.toLowerCase();
    const tags = skill.tags.map((tag) => tag.toLowerCase());

    // Every query term must match at least one field
    return queryTerms.every((term) => {
      return (
        name.includes(term) ||
        description.includes(term) ||
        relativePath.includes(term) ||
        tags.some((tag) => tag.includes(term))
      );
    });
  });
}
