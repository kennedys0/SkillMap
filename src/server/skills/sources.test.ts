import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_SKILL_SOURCES,
  resolveSkillSources,
} from "@/src/server/skills/sources";

function encodedSources(
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify([
    {
      id: "codex",
      label: "Codex skills",
      agent: "codex",
      root: "/srv/skills/codex",
      ...overrides,
    },
    {
      id: "shared",
      label: "Shared skills",
      agent: "shared",
      root: "/srv/skills/shared",
    },
  ]);
}

describe("resolveSkillSources", () => {
  it("parses bounded multi-source configuration including neutral shared skills", () => {
    const result = resolveSkillSources({
      SKILL_SOURCES_JSON: encodedSources(),
      SKILLS_ROOT: "/must/not/be/used",
    });

    assert.deepEqual(result, {
      status: "configured",
      sources: [
        {
          id: "codex",
          label: "Codex skills",
          agent: "codex",
          root: "/srv/skills/codex",
        },
        {
          id: "shared",
          label: "Shared skills",
          agent: "shared",
          root: "/srv/skills/shared",
        },
      ],
    });
  });

  it("uses one shared legacy source only when SKILL_SOURCES_JSON is absent", () => {
    assert.deepEqual(
      resolveSkillSources({ SKILLS_ROOT: "/srv/skills/legacy" }),
      {
        status: "configured",
        sources: [
          {
            id: "legacy",
            label: "Legacy skills",
            agent: "shared",
            root: "/srv/skills/legacy",
          },
        ],
      },
    );
    assert.deepEqual(resolveSkillSources({}), {
      status: "not_configured",
      sources: [],
    });
  });

  it("fails closed when SKILL_SOURCES_JSON is present but malformed", () => {
    const legacyRoot = "/must/not/fall/back/here";
    for (const value of ["", "not-json", "{}", "[]"]) {
      const result = resolveSkillSources({
        SKILL_SOURCES_JSON: value,
        SKILLS_ROOT: legacyRoot,
      });

      assert.equal(result.status, "invalid_configuration");
      assert.deepEqual(result.sources, []);
      assert.equal(JSON.stringify(result).includes(legacyRoot), false);
      assert.match(result.configurationError.message, /SKILL_SOURCES_JSON/);
    }
  });

  it("rejects duplicate IDs without returning any configured roots", () => {
    const result = resolveSkillSources({
      SKILL_SOURCES_JSON: JSON.stringify([
        {
          id: "same",
          label: "First",
          agent: "codex",
          root: "/srv/skills/first",
        },
        {
          id: "same",
          label: "Second",
          agent: "shared",
          root: "/srv/skills/second",
        },
      ]),
    });

    assert.equal(result.status, "invalid_configuration");
    assert.deepEqual(result.sources, []);
    assert.equal(result.configurationError.code, "DUPLICATE_SOURCE_ID");
  });

  it("rejects unknown keys, unsafe tokens, non-absolute roots, and unsafe labels", () => {
    const invalidOverrides = [
      { extra: true },
      { id: "Uppercase" },
      { agent: "agent with spaces" },
      { root: "relative/skills" },
      { label: "contains\u0000control" },
    ];

    for (const override of invalidOverrides) {
      const result = resolveSkillSources({
        SKILL_SOURCES_JSON: encodedSources(override),
      });
      assert.equal(result.status, "invalid_configuration");
      assert.deepEqual(result.sources, []);
    }
  });

  it("rejects source arrays above the documented maximum", () => {
    const sources = Array.from({ length: MAX_SKILL_SOURCES + 1 }, (_, index) => ({
      id: `source-${index}`,
      label: `Source ${index}`,
      agent: "shared",
      root: `/srv/skills/source-${index}`,
    }));

    const result = resolveSkillSources({
      SKILL_SOURCES_JSON: JSON.stringify(sources),
    });

    assert.equal(result.status, "invalid_configuration");
    assert.deepEqual(result.sources, []);
    assert.equal(result.configurationError.code, "INVALID_SOURCE_LIST");
  });
});
