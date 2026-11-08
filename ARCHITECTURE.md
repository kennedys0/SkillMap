# Architecture — MOCHI SkillMap MVP

## Intended topology
Browser (Next.js UI + MUI) → same-origin Next.js server routes/actions (Node.js) → source configuration resolver → read-only per-root scanner → metadata parser → deterministic matcher. No DB or external APIs.

## Data boundaries
- `SKILL_SOURCES_JSON` and legacy `SKILLS_ROOT` are **server-side only** env vars. Do not prefix either with `NEXT_PUBLIC_`.
- `SKILL_SOURCES_JSON` is authoritative whenever present: it contains 1–16 exact `{ id, label, agent, root }` objects with unique lowercase IDs and absolute roots. Malformed-present configuration fails closed. `SKILLS_ROOT` becomes one `legacy`/`shared` source only when the JSON variable is absent.
- Browser NEVER chooses an arbitrary server filesystem path. Do not expose raw skill file contents or an unrestricted file-reader endpoint.
- Only regular files named `SKILL.md` under configured roots are candidates. All symlinks are skipped; protected roots and roots with symlinked parents are rejected. Apply per-root and aggregate limits and handle permission errors independently.
- Display sanitized metadata only, with paths relative to each source root, never configured absolute paths. `agent` is an inventory grouping/provenance category, not a compatibility claim; `shared` is neutral.
- Keep scanner and matcher as pure/testable modules where possible.

## Implemented contract
- `src/contracts/api.ts` is the canonical interface for both endpoints. UI code must import or mirror those DTOs without adding fields.
- `GET /api/skills` returns validated summaries, scanner state and safe warnings.
- `POST /api/match` accepts one `projectDescription` field, trimmed to 1–2,000 Unicode characters. Bodies are limited to 8 KiB and the local process allows 30 match requests per 60 seconds.
- Every skill carries `sourceId`; every warning carries `sourceId`; `scan.sources` contains `{ id, label, agent, status, count }` without roots. Expected top-level scanner conditions use `ready`, `partial`, `not_configured`, `invalid_configuration`, `invalid_root` or `unavailable`. Per-source states use `ready`, `invalid_root`, `unavailable` or `skipped`.
- `invalid_configuration` includes a bounded actionable configuration error. `partial` exposes successful source data alongside failed or aggregate-skipped sources.
- Route responses never contain raw file content, absolute paths, stack traces or raw filesystem errors.

## Scanner and matcher limits
- Discovery stops after 6 directory levels or 500 exact `SKILL.md` candidates per root, and after 2,000 candidates across all roots. A candidate larger than 256 KiB is skipped.
- The scanner supports at most 16 configured roots. It rejects filesystem root, the user's home directory itself, root symlinks and roots with symlinked parents. Nested file and directory symlinks are skipped.
- Stable skill IDs hash source identity plus portable relative path, preventing collisions when two sources contain the same name/path.
- Matching uses Unicode NFKC normalization and exact alphanumeric terms. Stop words do not score; names weigh 3, tags 2 and descriptions 1.
- One term contributes only its highest applicable field weight. Results sort by score descending, then skill name and stable ID ascending.

## Project Skill Pack Builder Architecture

The Skill Pack Builder operates entirely within the browser client layer:
- **Contracts (`src/contracts/skill-pack.ts`)**: Defines `SkillPackV1`, `SkillPackSelectionV1`, `PackAgentRole`, and fixed limits (50 packs, 256 selections, 256 KiB import, 120 chars name, 2,000 chars description).
- **Core Modules (`src/client/packs/`)**:
  - `model.ts`: Pure constructors and deterministic reference keys.
  - `validation.ts`: Fail-closed UTF-8 byte checking and schema validation, rejecting prototype pollution and unsafe inputs.
  - `serialization.ts`: Canonical deterministic JSON export with sorted keys/selections and escaped Markdown generation.
  - `storage.ts`: LocalStorage persistence handling with fail-closed corruption guards and in-memory fallback.
  - `reconcile.ts`: Exact reference identity matching (`sourceId + relativePath + skillId + name`) preventing accidental remapping.
  - `builder-state.ts`: Immutable state operations for adding, removing, role assignment, and upserting packs.
- **Client Storage Boundary**: Packs reside exclusively in client browser state and `localStorage`. No server HTTP endpoints, filesystem writes, telemetry, or external sync APIs are added.

## Technologies
Next.js App Router + TypeScript, Node runtime on API routes, MUI. Use relevant packages only with specific justification. No database. No backend network fetch required for matching.

## Change management
Codex scaffolds and publishes the interface contract first. Antigravity implements UI once that contract is accessible. Cross-stack integration happens only after both parts are reviewable. Update this document if the implementation genuinely differs.
