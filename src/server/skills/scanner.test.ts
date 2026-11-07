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
  it("reports an unconfigured root without scanning a fallback", async () => {
    const result = await scanSkills({ root: "" });

    assert.deepEqual(result, {
      skills: [],
      scan: { status: "not_configured", skillCount: 0, warningCount: 0 },
      warnings: [],
    });
  });

  it("rejects relative, filesystem-root, and home-directory roots", async () => {
    for (const root of ["relative/skills", "/", homedir()]) {
      const result = await scanSkills({ root });
      assert.equal(result.scan.status, "invalid_root");
      assert.deepEqual(result.skills, []);
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

  it("returns a ready empty result for an empty root", async () => {
    await withTemporaryDirectory(async (root) => {
      const result = await scanSkills({ root });

      assert.deepEqual(result, {
        skills: [],
        scan: { status: "ready", skillCount: 0, warningCount: 0 },
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

      assert.deepEqual(
        result.skills.map((skill) => skill.name),
        ["Alpha Skill"],
      );
      assert.equal(JSON.stringify(result).includes("Outside Skill"), false);
    });
  });

  it("enforces recursion depth", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "one/two", "Within Depth");
      await createSkill(root, "one/two/three", "Beyond Depth");

      const result = await scanSkills({ root, maxDepth: 2 });

      assert.deepEqual(
        result.skills.map((skill) => skill.name),
        ["Within Depth"],
      );
    });
  });

  it("caps candidate count deterministically", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "charlie", "Charlie");
      await createSkill(root, "alpha", "Alpha");
      await createSkill(root, "bravo", "Bravo");

      const result = await scanSkills({ root, maxCandidates: 2 });

      assert.deepEqual(
        result.skills.map((skill) => skill.name),
        ["Alpha", "Bravo"],
      );
      assert.deepEqual(
        result.warnings.map((warning) => warning.code),
        ["SCAN_LIMIT_REACHED"],
      );
    });
  });

  it("skips oversized files with a safe warning", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "large", "Large");

      const result = await scanSkills({ root, maxFileBytes: 20 });

      assert.deepEqual(result.skills, []);
      assert.deepEqual(result.warnings, [
        {
          code: "OVERSIZED_SKILL",
          message: "A SKILL.md file exceeded the metadata size limit.",
          relativePath: "large/SKILL.md",
        },
      ]);
      assert.equal(JSON.stringify(result).includes(root), false);
    });
  });

  it("skips malformed metadata and continues scanning", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "good", "Good Skill");
      const badDirectory = join(root, "bad");
      await mkdir(badDirectory);
      await writeFile(join(badDirectory, "SKILL.md"), "not frontmatter", "utf8");

      const result = await scanSkills({ root });

      assert.deepEqual(
        result.skills.map((skill) => skill.name),
        ["Good Skill"],
      );
      assert.deepEqual(result.warnings, [
        {
          code: "MALFORMED_SKILL",
          message: "A SKILL.md file contained invalid metadata.",
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
            relativePath: "private",
          },
        ]);
        assert.equal(JSON.stringify(result).includes(root), false);
      } finally {
        await chmod(unreadable, 0o700);
      }
    });
  });

  it("returns stable IDs and portable relative paths in sorted order", async () => {
    await withTemporaryDirectory(async (root) => {
      await createSkill(root, "zulu", "Zulu");
      await createSkill(root, "alpha", "Alpha");

      const result = await scanSkills({ root });

      assert.deepEqual(result.skills, [
        {
          id: "59fa360eb8d92ee5c0020590",
          name: "Alpha",
          description: "A clearly described local test skill.",
          relativePath: "alpha/SKILL.md",
          tags: ["local-test"],
        },
        {
          id: "8ad1e73860a0d696ab61bff2",
          name: "Zulu",
          description: "A clearly described local test skill.",
          relativePath: "zulu/SKILL.md",
          tags: ["local-test"],
        },
      ]);
    });
  });
});
