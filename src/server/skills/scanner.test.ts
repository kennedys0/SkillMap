import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { scanSkills } from "@/src/server/skills/scanner";

function skillSource(
  name: string,
  description = "A clearly described local test skill.",
): string {
  return `---\nname: ${name}\ndescription: ${description}\ntags:\n  - local-test\n---\nTest fixture body.`;
}

async function createSkill(
  root: string,
  directory: string,
  name: string,
): Promise<string> {
  const skillDirectory = join(root, directory);
  await mkdir(skillDirectory, { recursive: true });
  const skillPath = join(skillDirectory, "SKILL.md");
  await writeFile(skillPath, skillSource(name), "utf8");
  return skillPath;
}

function source(id: string, root: string, agent = id) {
  return { id, label: `${id} skills`, agent, root };
}

function environment(sources: ReturnType<typeof source>[]) {
  return { SKILL_SOURCES_JSON: JSON.stringify(sources) };
}

async function withTemporaryDirectory(
  operation: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), "skillmap-scanner-test-"));
  try {
    await operation(directory);
  } finally {
    await chmod(directory, 0o700).catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
}

describe("scanSkills", () => {
  it("reports unconfigured legacy settings without scanning a fallback", async () => {
    const result = await scanSkills({ root: "" });

    assert.deepEqual(result, {
      skills: [],
      scan: {
        status: "not_configured",
        skillCount: 0,
        warningCount: 0,
        sources: [],
      },
      warnings: [],
    });
  });

  it("fails closed on malformed multi-source JSON without using SKILLS_ROOT", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "secret", "Must Not Be Scanned");

      const result = await scanSkills({
        environment: {
          SKILL_SOURCES_JSON: "not-json",
          SKILLS_ROOT: root,
        },
      });

      assert.equal(result.scan.status, "invalid_configuration");
      assert.equal(result.scan.configurationError?.code, "INVALID_JSON");
      assert.deepEqual(result.scan.sources, []);
      assert.deepEqual(result.skills, []);
      assert.equal(JSON.stringify(result).includes(root), false);
      assert.equal(JSON.stringify(result).includes("Must Not Be Scanned"), false);
    });
  });

  it("rejects relative configuration and protected absolute roots safely", async () => {
    const relative = await scanSkills({
      environment: environment([source("relative", "relative/skills")]),
    });
    assert.equal(relative.scan.status, "invalid_configuration");

    for (const root of ["/", homedir()]) {
      const result = await scanSkills({
        environment: environment([source("protected", root)]),
      });
      assert.equal(result.scan.status, "invalid_root");
      assert.deepEqual(result.skills, []);
      assert.deepEqual(result.scan.sources, [
        {
          id: "protected",
          label: "protected skills",
          agent: "protected",
          status: "invalid_root",
          count: 0,
        },
      ]);
      assert.equal(JSON.stringify(result).includes(root), false);
    }
  });

  it("reports nonexistent and non-directory roots as invalid", async () => {
    await withTemporaryDirectory(async (directory) => {
      const missing = await scanSkills({ root: join(directory, "missing") });
      assert.equal(missing.scan.status, "invalid_root");

      const filePath = join(directory, "file.txt");
      await writeFile(filePath, "not a directory", "utf8");
      const file = await scanSkills({ root: filePath });
      assert.equal(file.scan.status, "invalid_root");
    });
  });

  it("returns a ready empty result for an empty legacy root", async () => {
    await withTemporaryDirectory(async (root) => {
      const result = await scanSkills({ root });

      assert.deepEqual(result, {
        skills: [],
        scan: {
          status: "ready",
          skillCount: 0,
          warningCount: 0,
          sources: [
            {
              id: "legacy",
              label: "Legacy skills",
              agent: "shared",
              status: "ready",
              count: 0,
            },
          ],
        },
        warnings: [],
      });
    });
  });

  it("reads only exact SKILL.md files under the configured root", async () => {
    await withTemporaryDirectory(async (parent) => {
      const root = join(parent, "allowed");
      const outside = join(parent, "outside");
      await createSkill(root, "alpha", "Alpha Skill");
      await createSkill(outside, "secret", "Outside Skill");
      await writeFile(join(root, "alpha", "skill.md"), skillSource("Lowercase"));
      await writeFile(join(root, "alpha", "README.md"), skillSource("Readme"));

      const result = await scanSkills({ root });

      assert.deepEqual(result.skills.map((skill) => skill.name), ["Alpha Skill"]);
      assert.equal(result.skills[0]?.sourceId, "legacy");
      assert.equal(JSON.stringify(result).includes("Outside Skill"), false);
    });
  });

  it("enforces recursion depth per root", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "one/two", "Within Depth");
      await createSkill(root, "one/two/three", "Beyond Depth");

      const result = await scanSkills({ root, maxDepth: 2 });

      assert.deepEqual(result.skills.map((skill) => skill.name), ["Within Depth"]);
    });
  });

  it("caps each root independently and attributes limit warnings", async () => {
    await withTemporaryDirectory(async (parent) => {
      const first = join(parent, "first");
      const second = join(parent, "second");
      for (const root of [first, second]) {
        await createSkill(root, "charlie", "Charlie");
        await createSkill(root, "alpha", "Alpha");
        await createSkill(root, "bravo", "Bravo");
      }

      const result = await scanSkills({
        environment: environment([
          source("first", first),
          source("second", second),
        ]),
        maxCandidates: 2,
      });

      assert.equal(result.skills.length, 4);
      assert.deepEqual(result.scan.sources.map(({ id, count }) => ({ id, count })), [
        { id: "first", count: 2 },
        { id: "second", count: 2 },
      ]);
      assert.deepEqual(result.warnings, [
        {
          code: "SCAN_LIMIT_REACHED",
          message: "The skill candidate limit was reached for this source.",
          sourceId: "first",
        },
        {
          code: "SCAN_LIMIT_REACHED",
          message: "The skill candidate limit was reached for this source.",
          sourceId: "second",
        },
      ]);
    });
  });

  it("halts at the aggregate candidate limit and marks remaining sources skipped", async () => {
    await withTemporaryDirectory(async (parent) => {
      const first = join(parent, "first");
      const second = join(parent, "second");
      const third = join(parent, "third");
      await createSkill(first, "alpha", "Alpha");
      await createSkill(first, "bravo", "Bravo");
      await createSkill(second, "charlie", "Charlie");
      await createSkill(third, "delta", "Delta");

      const result = await scanSkills({
        environment: environment([
          source("first", first),
          source("second", second),
          source("third", third),
        ]),
        maxAggregateCandidates: 2,
      });

      assert.equal(result.scan.status, "partial");
      assert.deepEqual(result.skills.map((skill) => skill.name), ["Alpha", "Bravo"]);
      assert.deepEqual(result.scan.sources.map(({ id, status, count }) => ({ id, status, count })), [
        { id: "first", status: "ready", count: 2 },
        { id: "second", status: "skipped", count: 0 },
        { id: "third", status: "skipped", count: 0 },
      ]);
      assert.deepEqual(result.warnings, [
        {
          code: "AGGREGATE_SCAN_LIMIT_REACHED",
          message: "The aggregate skill candidate limit was reached.",
          sourceId: "second",
        },
      ]);
    });
  });

  it("skips oversized files with source-attributed safe warnings", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "large", "Large");

      const result = await scanSkills({ root, maxFileBytes: 20 });

      assert.deepEqual(result.skills, []);
      assert.deepEqual(result.warnings, [
        {
          code: "OVERSIZED_SKILL",
          message: "A SKILL.md file exceeded the metadata size limit.",
          sourceId: "legacy",
          relativePath: "large/SKILL.md",
        },
      ]);
      assert.equal(JSON.stringify(result).includes(root), false);
    });
  });

  it("attributes malformed metadata and continues scanning", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "good", "Good Skill");
      const badDirectory = join(root, "bad");
      await mkdir(badDirectory);
      await writeFile(join(badDirectory, "SKILL.md"), "not frontmatter", "utf8");

      const result = await scanSkills({ root });

      assert.deepEqual(result.skills.map((skill) => skill.name), ["Good Skill"]);
      assert.deepEqual(result.warnings, [
        {
          code: "MALFORMED_SKILL",
          message: "A SKILL.md file contained invalid metadata.",
          sourceId: "legacy",
          relativePath: "bad/SKILL.md",
        },
      ]);
    });
  });

  it("skips directory and file symlinks that point outside the root", async () => {
    await withTemporaryDirectory(async (parent) => {
      const root = join(parent, "root");
      const outside = join(parent, "outside");
      await mkdir(root);
      const outsideSkill = await createSkill(outside, "escaped", "Escaped Skill");
      await symlink(outside, join(root, "linked-directory"), "dir");
      const linkedFileDirectory = join(root, "linked-file");
      await mkdir(linkedFileDirectory);
      await symlink(outsideSkill, join(linkedFileDirectory, "SKILL.md"), "file");

      const result = await scanSkills({ root });

      assert.deepEqual(result.skills, []);
      assert.equal(JSON.stringify(result).includes("Escaped Skill"), false);
    });
  });

  it("rejects a configured root that is itself a symlink", async () => {
    await withTemporaryDirectory(async (parent) => {
      const target = join(parent, "target");
      await mkdir(target);
      const linkedRoot = join(parent, "linked-root");
      await symlink(target, linkedRoot, "dir");

      const result = await scanSkills({ root: linkedRoot });

      assert.equal(result.scan.status, "invalid_root");
      assert.equal(result.scan.sources[0]?.status, "invalid_root");
      assert.deepEqual(result.skills, []);
    });
  });

  it("turns unreadable nested directories into non-sensitive warnings", async () => {
    await withTemporaryDirectory(async (root) => {
      const unreadable = join(root, "private");
      await mkdir(unreadable);
      await chmod(unreadable, 0o000);
      try {
        const result = await scanSkills({ root });

        assert.deepEqual(result.skills, []);
        assert.deepEqual(result.warnings, [
          {
            code: "UNREADABLE_ENTRY",
            message: "An entry could not be read safely.",
            sourceId: "legacy",
            relativePath: "private",
          },
        ]);
        assert.equal(JSON.stringify(result).includes(root), false);
      } finally {
        await chmod(unreadable, 0o700);
      }
    });
  });

  it("keeps duplicate names distinct with stable source-specific IDs", async () => {
    await withTemporaryDirectory(async (parent) => {
      const first = join(parent, "one");
      const second = join(parent, "two");
      await createSkill(first, "same", "Duplicate Skill");
      await createSkill(second, "same", "Duplicate Skill");
      const config = {
        environment: environment([
          source("one", first),
          source("two", second),
        ]),
      };

      const firstScan = await scanSkills(config);
      const secondScan = await scanSkills(config);

      assert.deepEqual(firstScan.skills, [
        {
          id: "3074e223c280dddbc3ee16eb",
          sourceId: "one",
          name: "Duplicate Skill",
          description: "A clearly described local test skill.",
          relativePath: "same/SKILL.md",
          tags: ["local-test"],
        },
        {
          id: "c7ec46713db8f4d0098f493b",
          sourceId: "two",
          name: "Duplicate Skill",
          description: "A clearly described local test skill.",
          relativePath: "same/SKILL.md",
          tags: ["local-test"],
        },
      ]);
      assert.deepEqual(secondScan.skills, firstScan.skills);
    });
  });

  it("reports partial success when one root is valid and another is invalid", async () => {
    await withTemporaryDirectory(async (parent) => {
      const valid = join(parent, "valid");
      const missing = join(parent, "missing");
      await createSkill(valid, "alpha", "Alpha");

      const result = await scanSkills({
        environment: environment([
          source("valid", valid),
          source("missing", missing),
        ]),
      });

      assert.equal(result.scan.status, "partial");
      assert.deepEqual(result.skills.map((skill) => skill.sourceId), ["valid"]);
      assert.deepEqual(result.scan.sources.map(({ id, status, count }) => ({ id, status, count })), [
        { id: "valid", status: "ready", count: 1 },
        { id: "missing", status: "invalid_root", count: 0 },
      ]);
      assert.equal(JSON.stringify(result).includes(parent), false);
    });
  });
});
