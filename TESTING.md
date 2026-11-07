# Testing — MOCHI SkillMap MVP

## Commands
Codex will document actual commands after scaffolding. Expected categories: lint, typecheck, unit tests and production build. Do not claim they passed until executed and captured in the Multica issue.

## Unit coverage
- Metadata parser: well-formed frontmatter, missing fields, malformed YAML, weird Unicode.
- Scanner: configured root only; no env, empty root, permission errors; bounded recursion; symlink skip; non-SKILL.md files ignored; oversized files ignored.
- Matching: case normalization, relevant matches, irrelevant projects yield none, stable ordering/tie handling, explanations grounded in exact terms.

## UI/manual checks
- Desktop and narrow mobile, keyboard-only navigation, visible focus, no fake initial cards.
- All empty/loading/error states, long descriptions, zero matching terms, failed route.

## Quality gate
Provide exact commands and output summaries in Multica; unresolved failures must be disclosed. No automatic merge on a passing build alone.
