# Project Skill Pack Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local-only, source-aware skill pack builder that validates, saves, imports, exports, and reconciles references to real catalog skills without changing scanner or matcher behavior.

**Architecture:** A shared contract defines the versioned manifest and fixed limits. Focused client modules enforce import validation, deterministic serialization, localStorage failure handling, and exact catalog reconciliation; React components consume this boundary and keep all browser writes user-driven.

**Tech Stack:** Next.js App Router, React, TypeScript, MUI, Node test runner, browser localStorage and Web APIs; no new package.

**Spec:** `docs/superpowers/specs/2026-11-08-project-skill-pack-builder-design.md` (normative source: GitHub Issue #4)

## Global Constraints

- Never install, copy, execute, or modify `SKILL.md` files.
- Use real `SkillSummary`, `sourceId`, and `SkillMatch` data only; test fixtures stay in tests.
- Persistence is localStorage only. Add no server writes, database, telemetry, account, model call, or cloud sync.
- Roles record a manual user choice, never verified compatibility and never a default inferred from source provenance.
- Do not expose absolute roots, skill contents, tokens, home paths, or process data in manifests.
- Existing scanner, matcher, search, source filters, API DTOs, and error states must keep working.
- Human approval gates merge to `main`.

## Review Focus

- Prototype-bearing or extra-key objects must fail validation before any property is trusted; Task 2 tests `__proto__`, constructor, and nested extra keys.
- Byte and collection limits must be checked before expensive parse/write work; Tasks 2 and 4 pin exact boundaries.
- Same names across sources must coexist, while duplicate exact references fail; Tasks 2 and 5 test both cases.
- Storage read/write exceptions must preserve the draft and return usable errors; Task 4 injects throwing storage implementations.
- Rescan changes must never remap, drop, or auto-select a skill; Task 5 tests removed, renamed, and moved references.

---

### Task 1: Versioned skill pack contract and constructors

**Files:**
- Create: `src/contracts/skill-pack.ts`
- Create: `src/client/packs/model.test.ts`
- Create: `src/client/packs/model.ts`

**Interfaces:**
- Consumes: `SkillSummary` from `src/contracts/api.ts`.
- Produces: `PackAgentRole`, `SkillPackSelectionV1`, `SkillPackV1`, `SkillPackStoreV1`, fixed limits/storage key, `createSkillPack`, `createSkillPackSelection`, and `selectionReferenceKey`.

- [ ] Write tests proving new selections default to `unassigned`, source-specific duplicate names get different reference keys, and UUID generation is injected for deterministic tests.
- [ ] Run `npm test -- src/client/packs/model.test.ts`; expect failures because the module does not exist.
- [ ] Add the exact v1 types, constants, and minimal constructors.
- [ ] Run the focused test and then `npm test`; expect all tests to pass.
- [ ] Commit as `feat: define versioned skill pack contract`.

### Task 2: Strict import and manifest validation

**Files:**
- Create: `src/client/packs/validation.test.ts`
- Create: `src/client/packs/validation.ts`

**Interfaces:**
- Consumes: v1 types and limits from Task 1.
- Produces: `SkillPackValidationIssue`, `SkillPackValidationResult`, `validateSkillPack`, and `parseSkillPackJson`.

- [ ] Write table-driven failures for malformed/oversized JSON, unsupported schema, exact-key violations, non-plain objects, bad UUID/token/role/path/name fields, likely secrets, too many selections, and duplicate exact references; include valid same-name selections from two sources.
- [ ] Run `npm test -- src/client/packs/validation.test.ts`; verify failure from the absent validator.
- [ ] Implement byte-first parsing and fail-closed validation with bounded, field-specific issues.
- [ ] Run the focused test and full suite; expect green output.
- [ ] Commit as `feat: validate skill pack imports`.

### Task 3: Deterministic and safe exports

**Files:**
- Create: `src/client/packs/serialization.test.ts`
- Create: `src/client/packs/serialization.ts`

**Interfaces:**
- Consumes: validated `SkillPackV1` and `validateSkillPack`.
- Produces: `sortSkillPackSelections`, `serializeSkillPackJson`, `serializeSkillPackMarkdown`, and `buildSkillPackFilename`.

- [ ] Write tests for stable field/selection order, Markdown escaping, filename fallback, source-relative output, and absence of undeclared root/token/content fields.
- [ ] Run the focused test; verify the expected missing-module failure.
- [ ] Implement allowlisted canonical objects and conservative Markdown escaping without raw HTML.
- [ ] Run the focused test and full suite.
- [ ] Commit as `feat: export deterministic skill pack manifests`.

### Task 4: Local persistence with explicit failures

**Files:**
- Create: `src/client/packs/storage.test.ts`
- Create: `src/client/packs/storage.ts`

**Interfaces:**
- Consumes: `SkillPackStoreV1`, limits, and validators.
- Produces: `StorageLike`, `loadSkillPacks`, and `saveSkillPacks` result unions with safe error codes/messages.

- [ ] Write tests for empty storage, multi-pack round trip, 50-pack boundary, unsupported/corrupt envelope, blocked reads, quota writes, and no false save success.
- [ ] Run the focused test and verify RED.
- [ ] Implement one-read/one-write adapters that catch DOM/storage exceptions and never overwrite invalid stored data during load.
- [ ] Run focused and full tests.
- [ ] Commit as `feat: persist skill packs locally`.

### Task 5: Exact catalog reconciliation

**Files:**
- Create: `src/client/packs/reconcile.test.ts`
- Create: `src/client/packs/reconcile.ts`

**Interfaces:**
- Consumes: `SkillPackV1` and current `SkillSummary[]`.
- Produces: `ResolvedPackSelection`, `PackSelectionAvailability`, and `reconcileSkillPackSelections`.

- [ ] Write tests for exact availability, source collisions, missing entries, renamed snapshots, moved paths, and an unrelated same-name candidate.
- [ ] Run the focused test and verify RED.
- [ ] Implement O(n) lookup using full reference identity and no fallback matching.
- [ ] Run focused and full tests.
- [ ] Commit as `feat: reconcile saved skills with catalog`.

### Task 6: Builder workflow and accessible UI

**Files:**
- Create: `src/client/components/SkillPackBuilder.tsx`
- Create: `src/client/components/SkillPackImportDialog.tsx`
- Modify: `src/client/components/SkillMapApp.tsx`
- Modify: `src/client/components/ProjectMatcher.tsx`
- Modify: `src/client/components/SkillInventory.tsx`
- Modify: `src/client/components/SkillCard.tsx`
- Test: component/client tests chosen by the UI implementer within the existing Node test setup.

**Interfaces:**
- Consumes: Tasks 1–5 and existing catalog/matcher DTOs.
- Produces: explicit Add/Remove, manual role selection, named pack CRUD, confirmed delete/import, downloads, persistence feedback, and unavailable-reference states.

- [ ] Add failing interaction/state tests for explicit selection, duplicate prevention, manual roles, import preview, confirmed destructive actions, storage errors, stale references, and rescan behavior.
- [ ] Implement the responsive MUI workflow without changing scanner/matcher contracts or auto-selecting recommendations.
- [ ] Verify keyboard order, focus restoration, live announcements, 375px layout, desktop layout, contrast, long text, and reduced motion.
- [ ] Run focused tests and full release checks.
- [ ] Commit as `feat: add project skill pack builder UI`.

### Task 7: Documentation, cross-review, and PR

**Files:**
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `DESIGN.md`
- Modify: `SECURITY.md`
- Modify: `TESTING.md`

**Interfaces:**
- Consumes: implemented behavior and exact verification output.
- Produces: owner-facing usage, limits, privacy/storage warning, test evidence, screenshots when available, and an unmerged pull request.

- [ ] Document only shipped behavior, including key/limits, unsupported-version handling, manual-role disclaimer, storage privacy, and recovery from failures.
- [ ] Have Codex review import/export security and integration; have Antigravity review usability and accessibility.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=high`, `git diff --check`, and a staged secret-pattern scan; record exact results.
- [ ] Test the production build with real configured sources and verify export/import plus stale-reference behavior without fabricating production data.
- [ ] Open a PR from the feature/integration branch to `main`; do not merge it.
