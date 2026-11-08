# Multi-source Skill Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend SkillMap's read-only scanner and APIs to safely inventory multiple configured agent skill roots while preserving the legacy single-root fallback and deterministic matching.

**Architecture:** Parse server-only source configuration into validated source descriptors, then scan each root independently with the existing filesystem protections and per-root limits. Aggregate source-aware skills, warnings, and statuses without serializing roots; stable IDs hash source identity plus relative path. Both API routes pass through the shared scan snapshot, so the matcher remains deterministic and refers to source-specific skill IDs.

**Tech Stack:** TypeScript 5, Node.js filesystem APIs, Next.js App Router, Node test runner, MUI client types.

**Spec:** Tech Lead's binding Stage 1 summary in REGU-8 comment `01a1b968-6704-793b-b692-ebc48814b88a`, with existing governance in `ARCHITECTURE.md`, `SECURITY.md`, and `TESTING.md`. GitHub issue #2 could not be fetched in this runtime (`gh` unavailable, page fetch failed, public API returned 403), so this plan does not reconstruct unstated issue text.

## Global Constraints

- `SKILL_SOURCES_JSON` is a server-only JSON array of exactly `{ id, label, agent, root }`; maximum 16 sources, unique lowercase token IDs, absolute roots, and `shared` is the neutral agent category.
- `SKILLS_ROOT` is used only when `SKILL_SOURCES_JSON` is absent; malformed-present multi-source configuration fails closed without fallback.
- Every root keeps depth 6, candidate 500, and file 256 KiB limits; all roots share a 2,000-candidate aggregate limit.
- Root, parent-symlink, protected-root, nested-symlink, and read-only posture remain at least as strict as the current scanner.
- No absolute root, raw filesystem error, file body, stack trace, fabricated skill, or confidence percentage reaches an API payload.
- Existing endpoint fields remain; source-aware fields are additive and canonical in `src/contracts/api.ts`.

## Review Focus

- Environment variable present as whitespace or valid JSON with unknown keys must fail closed rather than activate `SKILLS_ROOT`.
- Two sources resolving to the same physical directory must remain separate configured identities without ID collision or root disclosure.
- Aggregate exhaustion during an early source must expose later sources as skipped instead of implying they were fully scanned.
- Mixed invalid and unavailable roots with no ready source must preserve each source status and return no skills.
- Warning ordering must stay deterministic when source IDs and relative paths overlap.

---

### Task 1: Freeze source-aware contracts and configuration parsing

**Files:**
- Modify: `src/contracts/api.ts`
- Create: `src/server/skills/sources.ts`
- Create: `src/server/skills/sources.test.ts`
- Modify: `src/client/api.test.ts`

**Interfaces:**
- Consumes: server-only `SKILL_SOURCES_JSON` and legacy `SKILLS_ROOT` strings.
- Produces: `SkillSourceConfig`, `resolveSkillSources(options): SourceResolution`, `MAX_SKILL_SOURCES = 16`, and DTOs `SkillSourceScanInfo`, source-aware `SkillSummary`, `ApiWarning`, and `ScanInfo`.

- [ ] **Step 1: Write failing configuration and contract tests**
  Cover valid multiple sources, unique IDs, exact keys, lowercase bounded IDs/agents, absolute roots, maximum source count, neutral `shared`, legacy fallback only when JSON is absent, and malformed-present JSON fail-closed behavior.

- [ ] **Step 2: Run tests to verify RED**
  Run: `npm test -- src/server/skills/sources.test.ts src/client/api.test.ts`
  Expected: FAIL because source parsing and required additive DTO fields do not exist.

- [ ] **Step 3: Implement the finalized DTOs and pure configuration parser**
  Keep errors non-sensitive and actionable. Configuration errors use `ScanStatus = "invalid_configuration"`; partial root success uses `"partial"`. Source scan status is `"ready" | "invalid_root" | "unavailable" | "skipped"`.

- [ ] **Step 4: Run focused tests to verify GREEN**
  Run: `npm test -- src/server/skills/sources.test.ts src/client/api.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Commit: `feat: define multi-source skill contracts`

### Task 2: Scan and match multiple safe roots

**Files:**
- Modify: `src/server/skills/scanner.ts`
- Modify: `src/server/skills/scanner.test.ts`
- Modify: `src/server/match/matcher.test.ts`
- Modify: `app/api/skills/route.test.ts`
- Modify: `app/api/match/route.test.ts`

**Interfaces:**
- Consumes: `resolveSkillSources`, `SkillSourceConfig`, and source-aware DTOs from Task 1.
- Produces: `scanSkills(config?): Promise<ScanResult>` with deterministic multi-root aggregation and source-specific IDs; unchanged matcher weights and request shapes.

- [ ] **Step 1: Write failing scanner and route tests**
  Cover legacy fallback, duplicate skill names across two roots, ID stability, one ready plus one invalid root, malformed config fail-closed, root and nested symlink escape, protected roots, malformed and oversized files, per-root and aggregate limits, deterministic warnings, correct matcher IDs, and absence of absolute paths in both API payloads.

- [ ] **Step 2: Run tests to verify RED**
  Run: `npm test -- src/server/skills/scanner.test.ts src/server/match/matcher.test.ts app/api/skills/route.test.ts app/api/match/route.test.ts`
  Expected: FAIL because the scanner accepts only one root and payload fixtures lack source attribution.

- [ ] **Step 3: Refactor the scanner into per-root scan plus deterministic aggregation**
  Hash `${sourceId}\0${relativePath}` for IDs, enforce candidate budgets before reads, attribute every warning to a source, mark unscanned sources `skipped` after aggregate exhaustion, and never include configured roots in results.

- [ ] **Step 4: Run focused tests to verify GREEN**
  Run: `npm test -- src/server/skills/scanner.test.ts src/server/match/matcher.test.ts app/api/skills/route.test.ts app/api/match/route.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  Commit: `feat: scan multiple skill sources safely`

### Task 3: Document configuration, API contract, safety, and evidence

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `SECURITY.md`
- Modify: `TESTING.md`
- Create: `docs/API.md`

**Interfaces:**
- Consumes: finalized Task 1 DTOs and Task 2 behavior.
- Produces: operator configuration examples and exact endpoint documentation without real local paths or demo production data.

- [ ] **Step 1: Update operator and governance documentation**
  Document JSON precedence/fail-closed behavior, 16-source maximum, `shared`, per-root limits, 2,000 aggregate candidates, source statuses, partial success, stable ID identity, warning attribution, and safe payload examples.

- [ ] **Step 2: Run the complete release gate**
  Run: `npm run typecheck && npm run lint && npm test && npm run build`
  Expected: all commands exit 0.

- [ ] **Step 3: Run dependency and secret checks**
  Run: `npm audit --audit-level=high`
  Expected: exit 0 with no high or critical findings; known moderate lint-chain findings may remain documented.

- [ ] **Step 4: Commit**
  Commit: `docs: document multi-source skill inventory`
