import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ignoredDirectories = new Set([
  ".git",
  ".next",
  ".superpowers",
  "coverage",
  "node_modules",
]);

async function findTests(directory) {
  const tests = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      tests.push(...(await findTests(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      tests.push(entryPath);
    }
  }

  return tests;
}

const requestedTests = process.argv.slice(2);
const tests = requestedTests.length > 0 ? requestedTests : await findTests(".");

if (tests.length === 0) {
  console.error("No TypeScript test files were found.");
  process.exit(1);
}

tests.sort((left, right) => left.localeCompare(right, "en"));

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", ...tests],
  { stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
