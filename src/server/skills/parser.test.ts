import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseSkillMetadata,
  SkillMetadataError,
} from "@/src/server/skills/parser";

function frontmatter(lines: string): string {
  return `---\n${lines}\n---\n# Instructions\nIgnored body content`;
}

function assertSkillError(
  operation: () => unknown,
  code: SkillMetadataError["code"],
) {
  assert.throws(
    operation,
    (error) => error instanceof SkillMetadataError && error.code === code,
  );
}

describe("parseSkillMetadata", () => {
  it("returns only normalized declared metadata", () => {
    const result = parseSkillMetadata(
      frontmatter(
        [
          "name: TypeScript Guide",
          "description: Helps with typed application code.",
          "tags:",
          "  - TypeScript",
          "  - testing",
          "extra: ignored",
        ].join("\n"),
      ),
    );

    assert.deepEqual(result, {
      name: "TypeScript Guide",
      description: "Helps with typed application code.",
      tags: ["TypeScript", "testing"],
    });
  });

  for (const [label, source] of [
    ["missing opening delimiter", "name: Missing\ndescription: No delimiter"],
    ["missing closing delimiter", "---\nname: Missing\ndescription: No close"],
  ]) {
    it(`rejects ${label}`, () => {
      assertSkillError(() => parseSkillMetadata(source), "MISSING_FRONTMATTER");
    });
  }

  for (const [field, lines] of [
    ["name", "description: Has no name"],
    ["description", "name: Has no description"],
  ]) {
    it(`rejects a missing ${field}`, () => {
      assertSkillError(
        () => parseSkillMetadata(frontmatter(lines)),
        "INVALID_METADATA",
      );
    });
  }

  it("rejects malformed YAML", () => {
    assertSkillError(
      () =>
        parseSkillMetadata(frontmatter("name: [broken\ndescription: nope")),
      "INVALID_FRONTMATTER",
    );
  });

  it("rejects YAML aliases", () => {
    assertSkillError(
      () =>
        parseSkillMetadata(
          frontmatter("name: &shared Alias\ndescription: *shared"),
        ),
      "INVALID_FRONTMATTER",
    );
  });

  it("normalizes unusual Unicode and whitespace", () => {
    const result = parseSkillMetadata(
      frontmatter(
        'name: "Ｃａｆｅ́  Helper"\ndescription: "Works\\n across   lines"',
      ),
    );

    assert.equal(result.name, "Café Helper");
    assert.equal(result.description, "Works across lines");
  });

  it("removes HTML and control characters from metadata", () => {
    const result = parseSkillMetadata(
      frontmatter(
        'name: "<b>Build</b>\\u0000"\ndescription: "<script>alert(1)</script> Helpful <em>tool</em>"',
      ),
    );

    assert.deepEqual(result, {
      name: "Build",
      description: "Helpful tool",
      tags: [],
    });
  });

  it("rejects invalid tag shapes", () => {
    assertSkillError(
      () =>
        parseSkillMetadata(
          frontmatter("name: Tagged\ndescription: Useful\ntags: one, two"),
        ),
      "INVALID_METADATA",
    );
  });

  it("normalizes and de-duplicates tags case-insensitively", () => {
    const result = parseSkillMetadata(
      frontmatter(
        "name: Tagged\ndescription: Useful\ntags:\n  - React\n  - react\n  - '  API  '",
      ),
    );

    assert.deepEqual(result.tags, ["React", "API"]);
  });

  for (const [field, name, descriptionLine] of [
    ["name", `${"n".repeat(121)}`, "description: Useful"],
    ["description", "Valid", `description: ${"d".repeat(1001)}`],
  ]) {
    it(`rejects an oversized ${field}`, () => {
      assert.throws(
        () =>
          parseSkillMetadata(frontmatter(`name: ${name}\n${descriptionLine}`)),
        SkillMetadataError,
      );
    });
  }

  it("rejects too many or oversized tags", () => {
    const tooManyTags = Array.from(
      { length: 21 },
      (_, index) => `  - tag-${index}`,
    ).join("\n");

    assertSkillError(
      () =>
        parseSkillMetadata(
          frontmatter(`name: Tagged\ndescription: Useful\ntags:\n${tooManyTags}`),
        ),
      "INVALID_METADATA",
    );
    assertSkillError(
      () =>
        parseSkillMetadata(
          frontmatter(
            `name: Tagged\ndescription: Useful\ntags:\n  - ${"t".repeat(41)}`,
          ),
        ),
      "INVALID_METADATA",
    );
  });
});
