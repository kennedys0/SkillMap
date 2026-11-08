import type { SkillSummary } from "@/src/contracts/api";
import type { SkillPackSelectionV1 } from "@/src/contracts/skill-pack";

export type PackSelectionAvailability = "available" | "unavailable";

export type ResolvedPackSelection =
  | {
      selection: SkillPackSelectionV1;
      availability: "available";
      skill: SkillSummary;
    }
  | {
      selection: SkillPackSelectionV1;
      availability: "unavailable";
      reason: "missing_or_changed";
    };

function catalogKey(sourceId: string, skillId: string, relativePath: string): string {
  return `${sourceId}\u0000${skillId}\u0000${relativePath}`;
}

export function reconcileSkillPackSelections(
  selections: readonly SkillPackSelectionV1[],
  catalog: readonly SkillSummary[],
): ResolvedPackSelection[] {
  const byExactReference = new Map<string, SkillSummary>();
  for (const skill of catalog) {
    byExactReference.set(catalogKey(skill.sourceId, skill.id, skill.relativePath), skill);
  }

  return selections.map((selection) => {
    const skill = byExactReference.get(
      catalogKey(selection.sourceId, selection.skillId, selection.relativePath),
    );

    if (skill && skill.name === selection.name) {
      return { selection, availability: "available", skill };
    }

    return { selection, availability: "unavailable", reason: "missing_or_changed" };
  });
}
