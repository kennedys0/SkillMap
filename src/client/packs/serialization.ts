import type { SkillPackSelectionV1, SkillPackV1 } from "@/src/contracts/skill-pack";
import { validateSkillPack } from "./validation";

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortSkillPackSelections(
  selections: readonly SkillPackSelectionV1[],
): SkillPackSelectionV1[] {
  return [...selections].sort(
    (left, right) =>
      compareText(left.sourceId, right.sourceId) ||
      compareText(left.relativePath, right.relativePath) ||
      compareText(left.skillId, right.skillId) ||
      compareText(left.role, right.role) ||
      compareText(left.name, right.name),
  );
}

function canonicalPack(pack: SkillPackV1): SkillPackV1 {
  const result = validateSkillPack(pack);
  if (!result.ok) {
    throw new Error("Cannot export an invalid skill pack.");
  }

  return {
    schemaVersion: result.value.schemaVersion,
    id: result.value.id,
    name: result.value.name,
    projectDescription: result.value.projectDescription,
    selections: sortSkillPackSelections(result.value.selections).map((selection) => ({
      skillId: selection.skillId,
      sourceId: selection.sourceId,
      relativePath: selection.relativePath,
      name: selection.name,
      role: selection.role,
    })),
  };
}

export function serializeSkillPackJson(pack: SkillPackV1): string {
  return `${JSON.stringify(canonicalPack(pack), null, 2)}\n`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]{}()#+\->!|])/gu, "\\$1");
}

export function serializeSkillPackMarkdown(pack: SkillPackV1): string {
  const canonical = canonicalPack(pack);
  const lines = [`# ${escapeMarkdown(canonical.name)}`, ""];

  if (canonical.projectDescription.length > 0) {
    lines.push(escapeMarkdown(canonical.projectDescription), "");
  }

  lines.push("## Skills", "");
  if (canonical.selections.length === 0) {
    lines.push("No skills selected.");
  } else {
    for (const selection of canonical.selections) {
      lines.push(
        `- **${escapeMarkdown(selection.name)}** — ${selection.role} · ${escapeMarkdown(selection.sourceId)} · ${escapeMarkdown(selection.relativePath)}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function buildSkillPackFilename(name: string, format: "json" | "md"): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80)
    .replace(/-+$/gu, "");
  const base = slug || "skill-pack";

  return format === "json" ? `${base}.skill-pack.json` : `${base}.md`;
}
