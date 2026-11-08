import { createHash } from "node:crypto";
import { constants, lstat, open, readdir, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";

import type {
  ApiWarning,
  ScanConfigurationError,
  ScanInfo,
  ScanStatus,
  SkillSourceScanInfo,
  SkillSourceScanStatus,
  SkillSummary,
} from "@/src/contracts/api";
import {
  parseSkillMetadata,
  SkillMetadataError,
} from "@/src/server/skills/parser";
import {
  resolveSkillSources,
  type SkillSourceConfig,
  type SourceEnvironment,
} from "@/src/server/skills/sources";

const DEFAULT_MAX_DEPTH = 6;
const DEFAULT_MAX_CANDIDATES = 500;
const DEFAULT_MAX_FILE_BYTES = 256 * 1_024;
export const DEFAULT_MAX_AGGREGATE_CANDIDATES = 2_000;

export interface ScanConfig {
  /** Test/integration override for exercising the legacy single-root path. */
  root?: string;
  /** Test/integration override; production reads process.env server-side. */
  environment?: SourceEnvironment;
  maxDepth?: number;
  maxCandidates?: number;
  maxFileBytes?: number;
  maxAggregateCandidates?: number;
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
  maxAggregateCandidates: number;
}

interface AggregateState {
  candidateCount: number;
  halted: boolean;
}

interface SourceScanResult {
  status: SkillSourceScanStatus;
  skills: SkillSummary[];
  warnings: ApiWarning[];
}

function emptyResult(
  status: ScanStatus,
  configurationError?: ScanConfigurationError,
): ScanResult {
  return {
    skills: [],
    scan: {
      status,
      skillCount: 0,
      warningCount: 0,
      sources: [],
      ...(configurationError ? { configurationError } : {}),
    },
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

function createSkillId(sourceId: string, relativePath: string): string {
  return createHash("sha256")
    .update(`${sourceId}\0${relativePath}`)
    .digest("hex")
    .slice(0, 24);
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

function sourceInfo(
  source: SkillSourceConfig,
  status: SkillSourceScanStatus,
  count: number,
): SkillSourceScanInfo {
  return {
    id: source.id,
    label: source.label,
    agent: source.agent,
    status,
    count,
  };
}

function deriveStatus(
  sources: SkillSourceScanInfo[],
  aggregateHalted: boolean,
): ScanStatus {
  if (aggregateHalted) {
    return "partial";
  }
  if (sources.every((source) => source.status === "ready")) {
    return "ready";
  }
  if (sources.some((source) => source.status === "ready")) {
    return "partial";
  }
  if (sources.every((source) => source.status === "invalid_root")) {
    return "invalid_root";
  }
  return "unavailable";
}

function finalize(
  skills: SkillSummary[],
  warnings: ApiWarning[],
  sources: SkillSourceScanInfo[],
  aggregateHalted: boolean,
): ScanResult {
  skills.sort(
    (left, right) =>
      left.name.localeCompare(right.name, "en", { sensitivity: "base" }) ||
      left.sourceId.localeCompare(right.sourceId, "en") ||
      left.relativePath.localeCompare(right.relativePath, "en"),
  );
  warnings.sort(
    (left, right) =>
      left.sourceId.localeCompare(right.sourceId, "en") ||
      (left.relativePath ?? "").localeCompare(right.relativePath ?? "", "en") ||
      left.code.localeCompare(right.code, "en"),
  );

  return {
    skills,
    scan: {
      status: deriveStatus(sources, aggregateHalted),
      skillCount: skills.length,
      warningCount: warnings.length,
      sources,
    },
    warnings,
  };
}

async function scanSource(
  source: SkillSourceConfig,
  limits: ScanLimits,
  aggregate: AggregateState,
): Promise<SourceScanResult> {
  if (!isAbsolute(source.root)) {
    return { status: "invalid_root", skills: [], warnings: [] };
  }

  const normalizedRoot = resolve(/* turbopackIgnore: true */ source.root);
  if (
    normalizedRoot === parse(normalizedRoot).root ||
    normalizedRoot === resolve(homedir())
  ) {
    return { status: "invalid_root", skills: [], warnings: [] };
  }

  let rootRealPath: string;
  try {
    const rootStats = await lstat(normalizedRoot);
    if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
      return { status: "invalid_root", skills: [], warnings: [] };
    }
    rootRealPath = await realpath(/* turbopackIgnore: true */ normalizedRoot);
    if (rootRealPath !== normalizedRoot) {
      return { status: "invalid_root", skills: [], warnings: [] };
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      status:
        code === "ENOENT" || code === "ENOTDIR"
          ? "invalid_root"
          : "unavailable",
      skills: [],
      warnings: [],
    };
  }

  const skills: SkillSummary[] = [];
  const warnings: ApiWarning[] = [];
  let sourceCandidateCount = 0;
  let sourceHalted = false;
  let aggregateReachedHere = false;

  async function walk(
    absoluteDirectory: string,
    relativeDirectory: string,
    depth: number,
  ): Promise<void> {
    if (sourceHalted || aggregate.halted) {
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
        if (sourceHalted || aggregate.halted || entry.isSymbolicLink()) {
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

        if (aggregate.candidateCount >= limits.maxAggregateCandidates) {
          warnings.push({
            code: "AGGREGATE_SCAN_LIMIT_REACHED",
            message: "The aggregate skill candidate limit was reached.",
            sourceId: source.id,
          });
          aggregate.halted = true;
          aggregateReachedHere = true;
          break;
        }
        if (sourceCandidateCount >= limits.maxCandidates) {
          warnings.push({
            code: "SCAN_LIMIT_REACHED",
            message: "The skill candidate limit was reached for this source.",
            sourceId: source.id,
          });
          sourceHalted = true;
          break;
        }
        sourceCandidateCount += 1;
        aggregate.candidateCount += 1;

        const portablePath = toPortablePath(relativeEntry);
        try {
          const resolvedFile = await realpath(absoluteEntry);
          if (!isContained(rootRealPath, resolvedFile)) {
            continue;
          }

          const fileSource = await readBoundedFile(
            absoluteEntry,
            limits.maxFileBytes,
          );
          if (fileSource === "oversized") {
            warnings.push({
              code: "OVERSIZED_SKILL",
              message: "A SKILL.md file exceeded the metadata size limit.",
              sourceId: source.id,
              relativePath: portablePath,
            });
            continue;
          }

          const metadata = parseSkillMetadata(fileSource);
          skills.push({
            id: createSkillId(source.id, portablePath),
            sourceId: source.id,
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
            sourceId: source.id,
            relativePath: portablePath,
          });
        }
      }
    } catch (error) {
      if (relativeDirectory.length === 0) {
        throw error;
      }
      warnings.push({
        code: "UNREADABLE_ENTRY",
        message: "An entry could not be read safely.",
        sourceId: source.id,
        relativePath: toPortablePath(relativeDirectory),
      });
    }
  }

  try {
    await walk(rootRealPath, "", 0);
  } catch {
    return { status: "unavailable", skills: [], warnings: [] };
  }

  return {
    status:
      aggregateReachedHere && sourceCandidateCount === 0 ? "skipped" : "ready",
    skills,
    warnings,
  };
}

export async function scanSkills(config: ScanConfig = {}): Promise<ScanResult> {
  const environment =
    config.root !== undefined
      ? { SKILLS_ROOT: config.root }
      : config.environment;
  const resolution = resolveSkillSources(environment);
  if (resolution.status === "not_configured") {
    return emptyResult("not_configured");
  }
  if (resolution.status === "invalid_configuration") {
    return emptyResult("invalid_configuration", resolution.configurationError);
  }

  const limits: ScanLimits = {
    maxDepth: positiveInteger(config.maxDepth, DEFAULT_MAX_DEPTH),
    maxCandidates: positiveInteger(config.maxCandidates, DEFAULT_MAX_CANDIDATES),
    maxFileBytes: positiveInteger(config.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxAggregateCandidates: positiveInteger(
      config.maxAggregateCandidates,
      DEFAULT_MAX_AGGREGATE_CANDIDATES,
    ),
  };
  const aggregate: AggregateState = { candidateCount: 0, halted: false };
  const skills: SkillSummary[] = [];
  const warnings: ApiWarning[] = [];
  const sources: SkillSourceScanInfo[] = [];

  for (const source of resolution.sources) {
    if (aggregate.halted) {
      sources.push(sourceInfo(source, "skipped", 0));
      continue;
    }

    const result = await scanSource(source, limits, aggregate);
    skills.push(...result.skills);
    warnings.push(...result.warnings);
    sources.push(sourceInfo(source, result.status, result.skills.length));
  }

  return finalize(skills, warnings, sources, aggregate.halted);
}
