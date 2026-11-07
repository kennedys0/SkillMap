# Architecture — MOCHI SkillMap MVP

## Intended topology
Browser (Next.js UI + MUI) → same-origin Next.js server routes/actions (Node.js) → read-only scanner → metadata parser → deterministic matcher. No DB or external APIs.

## Data boundaries
- `SKILLS_ROOT` is a **server-side only** env var. Do not prefix with `NEXT_PUBLIC_`.
- Browser NEVER chooses an arbitrary server filesystem path. Do not expose raw skill file contents or an unrestricted file-reader endpoint.
- Only regular files named `SKILL.md` under the configured root are candidates. Do not traverse symlinks outside root; preferably skip all symlinks. Apply limits on directory depth, candidate count and file size, document the chosen values, and handle permission errors.
- Display sanitized metadata only, with paths relative to the configured root, not absolute home paths.
- Keep scanner and matcher as pure/testable modules where possible.

## Contract guidance (Codex to finalize before UI work)
- `GET /api/skills` responds with validated skill summaries and non-sensitive scanner state.
- `POST /api/match` accepts a validated project description and responds with matched skill IDs and human-readable matched terms/reasons. Ensure rate/length limits appropriate to a local app.
- Errors have structured and understandable codes/messages. Do not echo full system paths, raw errors or file content to the client.
- Define exact TypeScript DTOs in code and link the contract in issue comments. Antigravity must not invent fields before contract is ready.

## Technologies
Next.js App Router + TypeScript, Node runtime on API routes, MUI. Use relevant packages only with specific justification. No database. No backend network fetch required for matching.

## Change management
Codex scaffolds and publishes the interface contract first. Antigravity implements UI once that contract is accessible. Cross-stack integration happens only after both parts are reviewable. Update this document if the implementation genuinely differs.
