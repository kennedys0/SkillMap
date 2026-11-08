# SkillMap Backend and API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the local Next.js/MUI application and deliver a secure, deterministic, tested skill catalog and matcher API.

**Architecture:** Node-only App Router handlers call focused parser, scanner, and matcher modules. The scanner accepts only the server-side configured root, skips symlinks, enforces resource limits, and returns sanitized summaries plus non-sensitive warnings; the matcher uses exact normalized terms and deterministic weighted ordering.

**Tech Stack:** Next.js 16, React 19, TypeScript, MUI, YAML, Vitest, ESLint.

**Spec:** `PRD.md` (with `ARCHITECTURE.md`, `SECURITY.md`, `TESTING.md`, and `AGENTS.md` as binding companion requirements)

## Global Constraints

- `SKILLS_ROOT` is server-only, absolute, explicit, and never defaults to a broader directory.
- Only regular case-sensitive `SKILL.md` candidates are read; all symlinks are skipped.
- Limits are depth 6, 500 candidates, and 256 KiB per file.
- API responses expose relative paths and sanitized metadata only, never raw file contents, absolute paths, stack traces, or raw errors.
- Project descriptions are trimmed, 1–2,000 characters, with request bodies capped at 8 KiB and matching capped at 30 requests per 60 seconds per process.
- No production fixtures, demo skills, remote calls, analytics, database, or filesystem writes.

## Review Focus

- A root or directory swapped for a symlink must not permit scanning outside the configured root; scanner security tests own this.
- YAML aliases, malformed mappings, HTML/control characters, and oversized metadata must not reach DTOs; parser tests own this.
- Unicode normalization and punctuation must not make exact matched terms unstable; matcher tests own this.
- Oversized, non-JSON, unknown-field, empty, and rate-limited requests must receive structured errors; route tests own this.
- Permission and race errors must produce safe state/warnings without absolute-path leakage; scanner and route tests own this.

---

### Task 1: Scaffold and lock the shared contract

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/theme-registry.tsx`, `app/globals.css`
- Create: `src/contracts/api.ts`

**Interfaces:**
- Produces: `SkillSummary`, `ScanInfo`, `ApiWarning`, `SkillsResponse`, `MatchRequest`, `SkillMatch`, `MatchResponse`, and `ApiErrorResponse` DTOs used by every later task.

- [ ] Scaffold the Next.js App Router, strict TypeScript, MUI provider, scripts, and dependency lockfile without production sample data.
- [ ] Define the exact DTO discriminants and fields in `src/contracts/api.ts` and confirm `npm run typecheck` succeeds.
- [ ] Commit the scaffold and contract.

### Task 2: Metadata parser

**Files:**
- Create: `src/server/skills/parser.test.ts`
- Create: `src/server/skills/parser.ts`

**Interfaces:**
- Produces: `parseSkillMetadata(source: string): ParsedSkillMetadata` and `SkillMetadataError`.
- Consumes: `SkillSummary` field limits and sanitization expectations from Task 1.

- [ ] Write parser tests for valid frontmatter, missing fields, malformed YAML, aliases, Unicode normalization, optional tag arrays, HTML/control sanitization, and field limits.
- [ ] Run the parser tests and verify they fail because the parser module is absent.
- [ ] Implement strict YAML frontmatter parsing and sanitized bounded metadata.
- [ ] Run the parser tests and full suite; commit when green.

### Task 3: Read-only bounded scanner

**Files:**
- Create: `src/server/skills/scanner.test.ts`
- Create: `src/server/skills/scanner.ts`
- Create: `src/server/skills/test-fixtures.ts`

**Interfaces:**
- Produces: `scanSkills(config?: ScanConfig): Promise<ScanResult>`.
- Consumes: `parseSkillMetadata` from Task 2 and shared scan DTOs from Task 1.

- [ ] Write filesystem-backed tests for missing/relative/root/nonexistent roots, empty root, configured-root isolation, exact filename filtering, recursion depth, candidate/file limits, malformed metadata, symlink escape, permission/race-safe handling, stable IDs, and safe relative paths.
- [ ] Run scanner tests and verify the missing scanner fails them.
- [ ] Implement a deterministic traversal that skips symlinks, revalidates containment, opens candidates read-only/no-follow, catches per-entry errors, and sorts summaries/warnings.
- [ ] Run scanner tests and full suite; commit when green.

### Task 4: Deterministic matcher

**Files:**
- Create: `src/server/match/matcher.test.ts`
- Create: `src/server/match/matcher.ts`

**Interfaces:**
- Produces: `matchSkills(projectDescription: string, skills: SkillSummary[]): SkillMatch[]`.
- Consumes: `SkillSummary` and `SkillMatch` from Task 1.

- [ ] Write tests for NFKC/case/punctuation normalization, stop words, no-overlap behavior, weighted name/tag/description terms, exact explanations, and score/name/id tie ordering.
- [ ] Run matcher tests and verify the missing matcher fails them.
- [ ] Implement exact-term matching with weights name=3, tags=2, description=1 and one contribution per term at its highest field weight.
- [ ] Run matcher tests and full suite; commit when green.

### Task 5: API boundaries

**Files:**
- Create: `src/server/http/request.ts`, `src/server/http/request.test.ts`
- Create: `src/server/http/rate-limit.ts`, `src/server/http/rate-limit.test.ts`
- Create: `app/api/skills/route.ts`, `app/api/skills/route.test.ts`
- Create: `app/api/match/route.ts`, `app/api/match/route.test.ts`

**Interfaces:**
- Produces: `GET /api/skills` and `POST /api/match` with the Task 1 DTOs.
- Consumes: scanner and matcher interfaces from Tasks 3–4.

- [ ] Write failing tests for bounded JSON parsing, validation, limiter windows, scanner-state pass-through, deterministic matches, status codes, and generic unexpected errors.
- [ ] Implement request parsing and the process-local fixed-window limiter, then the Node runtime handlers.
- [ ] Run route tests and full suite; commit when green.

### Task 6: Documentation and release evidence

**Files:**
- Modify: `README.md`, `ARCHITECTURE.md`, `TESTING.md`, `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Documents the exact runtime configuration, limits, matching algorithm, endpoint contract location, commands, and local-only boundary.

- [ ] Document implemented behavior and commands without fabricated output or data.
- [ ] Add framework security headers and verify response configuration via build/typecheck.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=high`, and inspect the staged diff for secrets/production fixtures.
- [ ] Perform a whole-branch review against every acceptance and security requirement, fix Critical/Important findings with RED→GREEN tests, and commit the final result.
