import type { SkillSourceScanInfo, SkillSummary } from "@/src/contracts/api";

export const STANDARD_AGENT_CATEGORIES = [
  "all",
  "codex",
  "antigravity",
  "hermes",
  "shared",
] as const;

export type StandardAgentCategory = (typeof STANDARD_AGENT_CATEGORIES)[number];

export interface CategorySummary {
  id: string;
  label: string;
  agent?: string;
  skillCount: number;
  configured: boolean;
  hasError: boolean;
  hasReadySource: boolean;
  statusSummary:
    | "ready"
    | "not_configured"
    | "invalid_root"
    | "unavailable"
    | "skipped"
    | "partial";
  sources: SkillSourceScanInfo[];
}

export interface FilterOptions {
  category?: string;
  sources?: SkillSourceScanInfo[];
}

function formatCategoryLabel(id: string): string {
  switch (id.toLowerCase()) {
    case "all":
      return "All";
    case "codex":
      return "Codex";
    case "antigravity":
      return "Antigravity";
    case "hermes":
      return "Hermes";
    case "shared":
      return "Shared";
    default:
      return id.charAt(0).toUpperCase() + id.slice(1);
  }
}

/**
 * Derives the active list of agent categories, computing true counts and configuration status
 * directly from scan.sources and actual skills.
 */
export function deriveCategories(
  skills: SkillSummary[],
  sources: SkillSourceScanInfo[] = [],
): CategorySummary[] {
  // Map sources by ID for quick skill lookup
  const sourceById = new Map<string, SkillSourceScanInfo>();
  for (const source of sources) {
    sourceById.set(source.id, source);
  }

  // Gather all unique agent keys from standard list plus any custom agent in sources
  const agentKeys = new Set<string>(STANDARD_AGENT_CATEGORIES);
  for (const source of sources) {
    if (source.agent) {
      agentKeys.add(source.agent.toLowerCase());
    }
  }

  const result: CategorySummary[] = [];

  for (const key of agentKeys) {
    if (key === "all") {
      const hasErrors = sources.some((s) => s.status !== "ready");
      const hasReady = sources.some((s) => s.status === "ready");

      result.push({
        id: "all",
        label: "All",
        skillCount: skills.length,
        configured: sources.length > 0,
        hasError: hasErrors,
        hasReadySource: hasReady,
        statusSummary:
          sources.length === 0
            ? "not_configured"
            : hasErrors && hasReady
            ? "partial"
            : hasErrors
            ? "unavailable"
            : "ready",
        sources,
      });
      continue;
    }

    const matchingSources = sources.filter(
      (s) => s.agent.toLowerCase() === key.toLowerCase(),
    );

    if (matchingSources.length === 0) {
      result.push({
        id: key,
        label: formatCategoryLabel(key),
        agent: key,
        skillCount: 0,
        configured: false,
        hasError: false,
        hasReadySource: false,
        statusSummary: "not_configured",
        sources: [],
      });
      continue;
    }

    const sourceIds = new Set(matchingSources.map((s) => s.id));
    const categorySkills = skills.filter((skill) =>
      sourceIds.has(skill.sourceId),
    );

    const hasReady = matchingSources.some((s) => s.status === "ready");
    const hasError = matchingSources.some((s) => s.status !== "ready");

    let statusSummary: CategorySummary["statusSummary"] = "ready";
    if (hasReady && hasError) {
      statusSummary = "partial";
    } else if (!hasReady && hasError) {
      // Pick the status of the first failing source
      const firstError = matchingSources.find((s) => s.status !== "ready");
      statusSummary = firstError ? firstError.status : "unavailable";
    }

    result.push({
      id: key,
      label: formatCategoryLabel(key),
      agent: key,
      skillCount: categorySkills.length,
      configured: true,
      hasError,
      hasReadySource: hasReady,
      statusSummary,
      sources: matchingSources,
    });
  }

  return result;
}

/**
 * Filters skills by agent category and search query against name, full description,
 * tags, relativePath, and source metadata.
 * Case-insensitive, trimmed, and operates on the complete description text.
 */
export function filterSkills(
  skills: SkillSummary[],
  query: string,
  options?: FilterOptions,
): SkillSummary[] {
  let filtered = skills;

  // 1. Filter by category if specified and not "all"
  const selectedCategory = options?.category?.trim().toLowerCase();
  if (selectedCategory && selectedCategory !== "all") {
    const sources = options?.sources ?? [];
    const matchingSources = sources.filter(
      (s) => s.agent.toLowerCase() === selectedCategory,
    );

    if (sources.length > 0) {
      const matchingSourceIds = new Set(matchingSources.map((s) => s.id));
      filtered = filtered.filter((skill) =>
        matchingSourceIds.has(skill.sourceId),
      );
    } else {
      // Fallback if sources list wasn't provided
      filtered = filtered.filter(
        (skill) => skill.sourceId.toLowerCase() === selectedCategory,
      );
    }
  }

  // 2. Filter by search query across full metadata
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return filtered;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const sourcesById = new Map<string, SkillSourceScanInfo>();
  if (options?.sources) {
    for (const s of options.sources) {
      sourcesById.set(s.id, s);
    }
  }

  return filtered.filter((skill) => {
    const name = skill.name.toLowerCase();
    const description = skill.description.toLowerCase();
    const relativePath = skill.relativePath.toLowerCase();
    const tags = skill.tags.map((tag) => tag.toLowerCase());
    const source = sourcesById.get(skill.sourceId);
    const sourceLabel = source?.label.toLowerCase() ?? "";
    const sourceAgent = source?.agent.toLowerCase() ?? "";

    // Every query term must match at least one metadata field
    return queryTerms.every((term) => {
      return (
        name.includes(term) ||
        description.includes(term) ||
        relativePath.includes(term) ||
        sourceLabel.includes(term) ||
        sourceAgent.includes(term) ||
        tags.some((tag) => tag.includes(term))
      );
    });
  });
}
