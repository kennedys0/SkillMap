import assert from "node:assert/strict";
import test, { describe } from "node:test";

import {
  MAX_SKILL_PACK_IMPORT_BYTES,
  MAX_SKILL_PACK_SELECTIONS,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import { parseSkillPackJson, validateSkillPack } from "./validation";

const validPack: SkillPackV1 = {
  schemaVersion: 1,
  id: "018f6a6b-5f16-7a22-9f84-123456789abc",
  name: "Release pack",
  projectDescription: "Ship the local tool.",
  selections: [
    {
      skillId: "111111111111111111111111",
      sourceId: "codex",
      relativePath: "planning/SKILL.md",
      name: "Project Planner",
      role: "codex",
    },
    {
      skillId: "222222222222222222222222",
      sourceId: "shared",
      relativePath: "planning/SKILL.md",
      name: "Project Planner",
      role: "unassigned",
    },
  ],
};

function clonePack(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(validPack)) as Record<string, unknown>;
}

describe("skill pack import validation", () => {
  test("accepts same-name skills when their exact source identities differ", () => {
    assert.deepEqual(validateSkillPack(validPack), {
      ok: true,
      value: validPack,
    });
  });

  const invalidCases: Array<{
    name: string;
    mutate: (pack: Record<string, unknown>) => unknown;
    code: string;
  }> = [
    {
      name: "unsupported schema",
      mutate: (pack) => ({ ...pack, schemaVersion: 2 }),
      code: "UNSUPPORTED_SCHEMA",
    },
    {
      name: "unknown manifest key",
      mutate: (pack) => ({ ...pack, unexpected: true }),
      code: "UNKNOWN_FIELD",
    },
    {
      name: "non-plain manifest",
      mutate: () => Object.assign(Object.create({ inherited: true }), validPack),
      code: "INVALID_OBJECT",
    },
    {
      name: "bad UUID",
      mutate: (pack) => ({ ...pack, id: "pack-1" }),
      code: "INVALID_ID",
    },
    {
      name: "invalid role",
      mutate: (pack) => ({
        ...pack,
        selections: [{ ...(pack.selections as object[])[0], role: "admin" }],
      }),
      code: "INVALID_ROLE",
    },
    {
      name: "invalid source token",
      mutate: (pack) => ({
        ...pack,
        selections: [{ ...(pack.selections as object[])[0], sourceId: "../shared" }],
      }),
      code: "INVALID_SOURCE_ID",
    },
    {
      name: "absolute path",
      mutate: (pack) => ({
        ...pack,
        selections: [{ ...(pack.selections as object[])[0], relativePath: "/home/a/SKILL.md" }],
      }),
      code: "INVALID_RELATIVE_PATH",
    },
    {
      name: "path traversal",
      mutate: (pack) => ({
        ...pack,
        selections: [{ ...(pack.selections as object[])[0], relativePath: "../secret/SKILL.md" }],
      }),
      code: "INVALID_RELATIVE_PATH",
    },
    {
      name: "markup in text",
      mutate: (pack) => ({ ...pack, projectDescription: "<script>alert(1)</script>" }),
      code: "UNSAFE_TEXT",
    },
    {
      name: "likely credential",
      mutate: (pack) => ({ ...pack, projectDescription: `token=${"x".repeat(24)}` }),
      code: "LIKELY_SECRET",
    },
    {
      name: "blank name",
      mutate: (pack) => ({ ...pack, name: "   " }),
      code: "INVALID_NAME",
    },
    {
      name: "invalid skill id",
      mutate: (pack) => ({
        ...pack,
        selections: [{ ...(pack.selections as object[])[0], skillId: "skill-one" }],
      }),
      code: "INVALID_SKILL_ID",
    },
  ];

  for (const invalidCase of invalidCases) {
    test(`rejects ${invalidCase.name}`, () => {
      const result = validateSkillPack(invalidCase.mutate(clonePack()));

      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.ok(result.issues.some((issue) => issue.code === invalidCase.code));
      }
    });
  }

  test("rejects duplicate exact references", () => {
    const pack = clonePack();
    const first = (pack.selections as object[])[0];
    pack.selections = [first, { ...first }];

    const result = validateSkillPack(pack);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.issues.some((issue) => issue.code === "DUPLICATE_SELECTION"));
    }
  });

  test("bounds selection count", () => {
    const pack = clonePack();
    pack.selections = Array.from({ length: MAX_SKILL_PACK_SELECTIONS + 1 }, (_, index) => ({
      ...(pack.selections as object[])[0],
      skillId: index.toString(16).padStart(24, "0"),
    }));

    const result = validateSkillPack(pack);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.issues.some((issue) => issue.code === "TOO_MANY_SELECTIONS"));
    }
  });

  test("rejects malformed JSON", () => {
    const result = parseSkillPackJson("{");

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.issues[0]?.code, "MALFORMED_JSON");
    }
  });

  test("checks UTF-8 byte size before parsing", () => {
    const result = parseSkillPackJson(`"${"é".repeat(MAX_SKILL_PACK_IMPORT_BYTES)}"`);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.issues[0]?.code, "IMPORT_TOO_LARGE");
    }
  });

  test("rejects prototype-pollution fields parsed from JSON", () => {
    const json = JSON.stringify(validPack).replace(
      '"schemaVersion":1',
      '"schemaVersion":1,"__proto__":{"polluted":true}',
    );
    const result = parseSkillPackJson(json);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.ok(result.issues.some((issue) => issue.code === "UNKNOWN_FIELD"));
    }
    assert.equal(({} as { polluted?: boolean }).polluted, undefined);
  });
});
