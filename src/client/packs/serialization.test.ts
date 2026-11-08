import assert from "node:assert/strict";
import test, { describe } from "node:test";

import type { SkillPackV1 } from "@/src/contracts/skill-pack";
import {
  buildSkillPackFilename,
  serializeSkillPackJson,
  serializeSkillPackMarkdown,
} from "./serialization";

const pack: SkillPackV1 = {
  schemaVersion: 1,
  id: "018f6a6b-5f16-7a22-9f84-123456789abc",
  name: "Release *pack*",
  projectDescription: "Ship [the tool](locally).",
  selections: [
    {
      skillId: "222222222222222222222222",
      sourceId: "shared",
      relativePath: "zeta/SKILL.md",
      name: "Zeta skill",
      role: "unassigned",
    },
    {
      skillId: "111111111111111111111111",
      sourceId: "codex",
      relativePath: "alpha/SKILL.md",
      name: "Alpha `skill`",
      role: "codex",
    },
  ],
};

describe("skill pack serialization", () => {
  test("emits canonical JSON with stable field and selection order", () => {
    const first = serializeSkillPackJson(pack);
    const second = serializeSkillPackJson({ ...pack, selections: [...pack.selections].reverse() });

    assert.equal(first, second);
    assert.ok(first.endsWith("\n"));
    assert.ok(first.indexOf('"schemaVersion"') < first.indexOf('"id"'));
    assert.ok(first.indexOf('"111111111111111111111111"') < first.indexOf('"222222222222222222222222"'));
    assert.deepEqual(Object.keys(JSON.parse(first) as object), [
      "schemaVersion",
      "id",
      "name",
      "projectDescription",
      "selections",
    ]);
  });

  test("exports only source-relative references and declared manifest fields", () => {
    const output = serializeSkillPackJson(pack);

    assert.match(output, /"sourceId": "codex"/u);
    assert.match(output, /"relativePath": "alpha\/SKILL.md"/u);
    assert.doesNotMatch(output, /absolutePath|root|content|apiKey|token/iu);
  });

  test("escapes Markdown syntax and keeps source attribution", () => {
    const output = serializeSkillPackMarkdown(pack);

    assert.match(output, /^# Release \\\*pack\\\*/u);
    assert.ok(output.includes("Ship \\[the tool\\]\\(locally\\)."));
    assert.match(output, /codex · alpha\/SKILL\.md/u);
    assert.match(output, /Alpha \\`skill\\`/u);
    assert.doesNotMatch(output, /<[^>]+>/u);
  });

  test("builds a portable filename with a safe fallback", () => {
    assert.equal(buildSkillPackFilename(" Release / Pack ", "json"), "release-pack.skill-pack.json");
    assert.equal(buildSkillPackFilename("日本語", "md"), "skill-pack.md");
  });

  test("refuses to serialize an invalid in-memory pack", () => {
    assert.throws(
      () => serializeSkillPackJson({ ...pack, projectDescription: "token=abcdefghijklmnopqrstuvwxyz" }),
      /valid skill pack/u,
    );
  });
});
