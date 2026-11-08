# Testing — MOCHI SkillMap MVP

## Commands
Run the release checks from the repository root:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

`npm test -- path/to/file.test.ts` runs one or more named TypeScript test files. The bare command discovers every `*.test.ts` file and fails when none exist.

## Unit coverage
- Metadata parser: well-formed frontmatter, missing fields, malformed YAML, weird Unicode.
- Source configuration: valid 1–16 source arrays, exact fields, lowercase tokens, unique IDs, absolute roots, neutral `shared`, legacy fallback only when JSON is absent, and malformed-present fail-closed behavior.
- Scanner: legacy root, two roots with duplicate names, partial success, protected/missing/unreadable roots, bounded recursion, symlink escape, non-`SKILL.md` files ignored, malformed/oversized files skipped, 500-candidate per-root and 2,000-candidate aggregate handling, deterministic warning attribution, stable source-specific IDs, and no absolute paths in results.
- Matching: case normalization, relevant matches, irrelevant projects yield none, stable ordering/tie handling, duplicate-name source IDs, and explanations grounded in exact terms.
- Routes/contracts: additive source fields pass through both endpoints, warnings retain source attribution, malformed requests stay structured, and unexpected errors reveal no stack/path details.

## UI/manual checks
- Desktop and narrow mobile, keyboard-only navigation, visible focus, no fake initial cards.
- All empty/loading/error states, long descriptions, zero matching terms, failed route.

## Quality gate
Provide exact commands and output summaries in Multica; unresolved failures must be disclosed. No automatic merge on a passing build alone.
