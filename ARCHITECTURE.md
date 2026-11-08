# Architecture — MOCHI SkillMap MVP

## Intended topology
Browser (Next.js UI + MUI) → same-origin Next.js server routes/actions (Node.js) → read-only scanner → metadata parser → deterministic matcher. No DB or external APIs.

## Data boundaries
- `SKILLS_ROOT` is a **server-side only** env var. Do not prefix with `NEXT_PUBLIC_`.
- Browser NEVER chooses an arbitrary server filesystem path. Do not expose raw skill file contents or an unrestricted file-reader endpoint.
- Only regular files named `SKILL.md` under the configured root are candidates. Do not traverse symlinks outside root; preferably skip all symlinks. Apply limits on directory depth, candidate count and file size, document the chosen values, and handle permission errors.
- Display sanitized metadata only, with paths relative to the configured root, not absolute home paths.
- Keep scanner and matcher as pure/testable modules where possible.

## Implemented contract
- `src/contracts/api.ts` is the canonical interface for both endpoints. UI code must import or mirror those DTOs without adding fields.
- `GET /api/skills` returns validated summaries, scanner state and safe warnings.
- `POST /api/match` accepts one `projectDescription` field, trimmed to 1–2,000 Unicode characters. Bodies are limited to 8 KiB and the local process allows 30 match requests per 60 seconds.
- Expected scanner conditions use `ready`, `not_configured`, `invalid_root` or `unavailable`. Unexpected failures use structured error codes and generic messages.
- Route responses never contain raw file content, absolute paths, stack traces or raw filesystem errors.

## Scanner and matcher limits
- Discovery stops after 6 directory levels or 500 exact `SKILL.md` candidates. A candidate larger than 256 KiB is skipped.
- The scanner rejects filesystem root, the user's home directory itself, root symlinks and roots with symlinked parents. Nested file and directory symlinks are skipped.
- Matching uses Unicode NFKC normalization and exact alphanumeric terms. Stop words do not score; names weigh 3, tags 2 and descriptions 1.
- One term contributes only its highest applicable field weight. Results sort by score descending, then skill name and stable ID ascending.

## Technologies
Next.js App Router + TypeScript, Node runtime on API routes, MUI. Use relevant packages only with specific justification. No database. No backend network fetch required for matching.

## Change management
Codex scaffolds and publishes the interface contract first. Antigravity implements UI once that contract is accessible. Cross-stack integration happens only after both parts are reviewable. Update this document if the implementation genuinely differs.
