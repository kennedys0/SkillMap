import { createHash } from "node:crypto";
import {
  constants,
  lstat,
  open,
  readdir,
  realpath,
} from "node:fs/promises";
import { homedir } from "node:os";
import {
  isAbsolute,
  join,
  parse,
  relative,
  resolve,
  sep,
} from "node:path";

import type {
  ApiWarning,
  ScanInfo,
  ScanStatus,
  SkillSummary,
} from "@/src/contracts/api";
import {
  parseSkillMetadata,
  SkillMetadataError,
} from "@/src/server/skills/parser";

const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_CANDIDATES = 500;
const DEFAULT_MAX_FILE_BYTES = 256 * 1_024;

export interface ScanConfig {
  root?: string;
  maxDepth?: number;
  maxCandidates?: number;
  maxFileBytes?: number;
}

export interface ScanResult {
  skills: SkillSummary[];
  scan: ScanInfo;
  warnings: ApiWarning[];
}

interface ScanLimits {
  maxDepth: number;
  maxCandidates: number;
  maxFileBytes: number;
}

function emptyResult(status: ScanStatus): ScanResult {
  return {
    skills: [],
    scan: { status, skillCount: 0, warningCount: 0 },
    warnings: [],
  };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && (value ?? 0) > 0 ? value! : fallback;
}

function toPortablePath(value: string): string {
  return value.split(sep).join("/");
}

function isContained(root: string, candidate: string): boolean {
  const fromRoot = relative(root, candidate);
  return (
    fromRoot === "" ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !isAbsolute(fromRoot))
  );
}

function createSkillId(relativePath: string): string {
  return createHash("sha256").update(relativePath).digest("hex").slice(0, 24);
}

async function readBoundedFile(
  filePath: string,
  maxFileBytes: number,
): Promise<"oversized" | string> {
  const handle = await open(
    filePath,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new Error("Candidate is not a regular file.");
    }
    if (stats.size > maxFileBytes) {
      return "oversized";
    }

    const buffer = Buffer.allocUnsafe(maxFileBytes + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(
        buffer,
        offset,
        buffer.length - offset,
        offset,
      );
      if (bytesRead === 0) {
        break;
      }
      offset += bytesRead;
    }

    if (offset > maxFileBytes) {
      return "oversized";
    }
    return buffer.subarray(0, offset).toString("utf8");
  } finally {
    await handle.close();
  }
}

function finalize(
  skills: SkillSummary[],
  warnings: ApiWarning[],
): ScanResult {
  skills.sort(
    (left, right) =>
      left.name.localeCompare(right.name, "en", { sensitivity: "base" }) ||
      left.relativePath.localeCompare(right.relativePath, "en"),
  );
  warnings.sort(
    (left, right) =>
      (left.relativePath ?? "").localeCompare(right.relativePath ?? "", "en") ||
      left.code.localeCompare(right.code, "en"),
  );

  return {
    skills,
    scan: {
      status: "ready",
      skillCount: skills.length,
      warningCount: warnings.length,
    },
    warnings,
  };
}

export async function scanSkills(config: ScanConfig = {}): Promise<ScanResult> {
  const configuredRoot = config.root ?? process.env.SKILLS_ROOT ?? "";
  if (configuredRoot.trim().length === 0) {
    return emptyResult("not_configured");
  }
  if (!isAbsolute(configuredRoot)) {
    return emptyResult("invalid_root");
  }

  const normalizedRoot = resolve(configuredRoot);
  if (
    normalizedRoot === parse(normalizedRoot).root ||
    normalizedRoot === resolve(homedir())
  ) {
    return emptyResult("invalid_root");
  }

  let rootRealPath: string;
  try {
    const rootStats = await lstat(normalizedRoot);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
      return emptyResult("invalid_root");
    }
    rootRealPath = await realpath(normalizedRoot);
    if (rootRealPath !== normalizedRoot) {
      return emptyResult("invalid_root");
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return emptyResult(
      code === "ENOENT" || code === "ENOTDIR" ? "invalid_root" : "unavailable",
    );
  }

  const limits: ScanLimits = {
    maxDepth: positiveInteger(config.maxDepth, DEFAULT_MAX_DEPTH),
    maxCandidates: positiveInteger(
      config.maxCandidates,
      DEFAULT_MAX_CANDIDATES,
    ),
    maxFileBytes: positiveInteger(config.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
  };
  const skills: SkillSummary[] = [];
  const warnings: ApiWarning[] = [];
  let candidateCount = 0;
  let halted = false;

  async function walk(
    absoluteDirectory: string,
    relativeDirectory: string,
    depth: number,
  ): Promise<void> {
    if (halted) {
      return;
    }

    try {
      const resolvedDirectory = await realpath(absoluteDirectory);
      if (!isContained(rootRealPath, resolvedDirectory)) {
        return;
      }

      const entries = await readdir(absoluteDirectory, { withFileTypes: true });
      entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

      for (const entry of entries) {
        if (halted || entry.isSymbolicLink()) {
          continue;
        }

        const absoluteEntry = join(absoluteDirectory, entry.name);
        const relativeEntry = relativeDirectory
          ? join(relativeDirectory, entry.name)
          : entry.name;

        if (entry.isDirectory()) {
          if (depth < limits.maxDepth) {
            await walk(absoluteEntry, relativeEntry, depth + 1);
          }
          continue;
        }
        if (!entry.isFile() || entry.name !== "SKILL.md") {
          continue;
        }

        if (candidateCount >= limits.maxCandidates) {
          warnings.push({
            code: "SCAN_LIMIT_REACHED",
            message: "The skill candidate limit was reached.",
          });
          halted = true;
          break;
        }
        candidateCount += 1;

        const portablePath = toPortablePath(relativeEntry);
        try {
          const resolvedFile = await realpath(absoluteEntry);
          if (!isContained(rootRealPath, resolvedFile)) {
            continue;
          }

          const source = await readBoundedFile(absoluteEntry, limits.maxFileBytes);
          if (source === "oversized") {
            warnings.push({
              code: "OVERSIZED_SKILL",
              message: "A SKILL.md file exceeded the metadata size limit.",
              relativePath: portablePath,
            });
            continue;
          }

          const metadata = parseSkillMetadata(source);
          skills.push({
            id: createSkillId(portablePath),
            ...metadata,
            relativePath: portablePath,
          });
        } catch (error) {
          warnings.push({
            code:
              error instanceof SkillMetadataError
                ? "MALFORMED_SKILL"
                : "UNREADABLE_ENTRY",
            message:
              error instanceof SkillMetadataError
                ? "A SKILL.md file contained invalid metadata."
                : "An entry could not be read safely.",
            relativePath: portablePath,
          });
        }
      }
    } catch {
      warnings.push({
        code: "UNREADABLE_ENTRY",
        message: "An entry could not be read safely.",
        ...(relativeDirectory
          ? { relativePath: toPortablePath(relativeDirectory) }
          : {}),
      });
    }
  }

  try {
    await walk(rootRealPath, "", 0);
  } catch {
    return emptyResult("unavailable");
  }

  if (
    warnings.length === 1 &&
    warnings[0]?.code === "UNREADABLE_ENTRY" &&
    warnings[0].relativePath === undefined &&
    skills.length === 0
  ) {
    return emptyResult("unavailable");
  }

  return finalize(skills, warnings);
}
