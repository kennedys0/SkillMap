# Task Instructions — First Agent Run

1. Hermes: read linked repo and governance files. If repo does not exist or cannot be checked out, mark blocked and report the exact blocker; do not invent success.
2. Hermes: route initial scaffold/API/parser/matcher and tests to Codex; obtain real interface contract.
3. Hermes: after Codex makes work accessible, route UI to Antigravity. Clarify whether Taste Engine skill is actually installed. Use DESIGN.md if not.
4. Hermes: route integration and review work in non-overlapping stages. Report verified results and request human approval.
5. Codex and Antigravity: use issue comments for decisions, provide branch/PR and changed-file paths. Do not touch the default branch directly.
6. Owner: review the actual UI and tests, decide whether to merge.

## Stop conditions
- Missing required runtime/CLI or inaccessible repo.
- Work requires copying private files, exposing a service publicly, or a paid dependency.
- Unresolved path traversal or secret leak risk.
- No isolated branch/worktree for shared-file concurrent edits.
