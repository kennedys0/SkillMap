# MOCHI SkillMap

SkillMap is a local-only catalog for installed agent skills. It reads metadata from real `SKILL.md` files under explicitly configured directories, then ranks those skills against a project description with exact keyword scoring. It doesn't send file content or project descriptions to an external service.

The repository contains the Next.js/MUI scaffold, the complete scanner, parser, matcher, API layer, and the responsive skills inventory and deterministic project brief matcher UI.

## Run it locally

Requirements: Node.js 20.9 or newer and npm 10.

```bash
npm ci
```

Create `.env.local` and configure up to 16 sources. `id` and `agent` are lowercase tokens; use `agent: "shared"` for a neutral/shared source. `agent` describes the inventory grouping or provenance only—finding a skill under an agent directory does not claim that the skill is compatible with that agent.

```dotenv
SKILL_SOURCES_JSON=[{"id":"codex","label":"Codex skills","agent":"codex","root":"/absolute/path/to/codex/skills"},{"id":"shared","label":"Shared skills","agent":"shared","root":"/absolute/path/to/shared/skills"}]
```

The legacy `SKILLS_ROOT=/absolute/path/to/skills` mode remains available only when `SKILL_SOURCES_JSON` is absent. If `SKILL_SOURCES_JSON` is present but malformed, empty, over 16 sources, contains duplicate IDs, relative paths, unknown fields, or invalid values, SkillMap reports `invalid_configuration` and scans nothing. It never falls through to `SKILLS_ROOT` or another directory.

Start the local development server with `npm run dev`; stop it with Ctrl-C. The project scripts bind to `127.0.0.1` by default. This MVP has no authentication and must not be exposed to the public internet.

If no source configuration exists, or a root is the filesystem root, the home directory itself, a symlink (including a path with symlinked parents), missing, or unreadable, the API returns a non-sensitive scanner state instead of choosing a fallback path. One failed root does not hide successful roots: the top-level status is `partial` and `scan.sources` reports each source independently.

## API

`GET /api/skills` returns sanitized source-aware skill summaries, scan state, and safe source-attributed warnings. `POST /api/match` accepts this body:

```json
{
  "projectDescription": "A project description between 1 and 2000 characters"
}
```

The canonical TypeScript DTOs live in `src/contracts/api.ts`; the endpoint contract and status semantics are documented in `docs/API.md`. Route modules run in the Node.js runtime and disable response caching.

The scanner reads regular files named exactly `SKILL.md`. It skips symlinks, limits each root to 6 directory levels and 500 candidates, caps all roots together at 2,000 candidates, and reads no more than 256 KiB from one candidate. Once the aggregate limit is encountered, remaining sources are marked `skipped`. Returned paths stay relative to their source root; configured absolute paths are never serialized.

Skill IDs are the first 24 hexadecimal characters of a SHA-256 digest over source ID plus relative path. They remain stable for the same configured source identity and path across repeated scans, while the same skill name/path in two sources receives distinct IDs.

Matching normalizes text with Unicode NFKC, lowercases it, removes punctuation, and drops common English plus generic project words. Name matches score 3, tag matches score 2, and description matches score 1; a term contributes only its highest field weight. Results sort by score, skill name, then stable skill ID. The API returns exact matched terms and a plain-language reason, never a confidence percentage.

`POST /api/match` caps JSON bodies at 8 KiB and permits 30 requests per 60-second process window. The limiter suits this single-process local app; it isn't a distributed deployment control.

## Project Skill Pack Builder

SkillMap includes a browser-only Project Skill Pack Builder that lets developers assemble references to discovered skills into named packs, assign manual agent roles (`codex`, `antigravity`, `hermes`, `unassigned`), and exchange packs as deterministic JSON or Markdown files.

- **Local Persistence**: Skill packs are stored locally in the browser under the `mochi.skillmap.skill-packs.v1` localStorage key (up to 50 packs, 256 selections per pack).
- **Graceful Storage Fallback**: If browser storage is disabled or quota is exceeded, the pack remains fully usable and exportable in memory.
- **Exact Catalog Reconciliation**: When skills are moved, renamed, or deleted across catalog rescans, references remain intact and are clearly flagged as unavailable without auto-dropping or remapping.
- **Deterministic Export**: Export canonical `.skill-pack.json` manifests with stable key ordering or sanitized `.md` summaries.
- **Strict Import Validation**: Imported `.json` files are byte-checked (max 256 KiB) and verified client-side against the v1 schema, rejecting prototype pollution, unexpected fields, credentials, or malicious path traversal.
- **Manual Role Intent**: Roles reflect explicit developer intent, not verified execution compatibility.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit --audit-level=high
```

Tests create synthetic `SKILL.md` fixtures only in temporary test directories. Production paths contain no demo skills or fallback records.

## Dependency notes

MUI and Emotion provide the project-mandated component foundation. `yaml` parses frontmatter without executing skill content, while `tsx` runs TypeScript tests through Node's built-in test runner. The app has no database client, telemetry SDK, remote API client, or skill execution dependency.

Audit note, 2026-11-08: npm reports eight moderate findings in the development-only `eslint-config-next` → `typescript-eslint` → `minimatch` chain. No high or critical advisory is present, and npm's offered fix makes a breaking lint-chain change. Recheck this deferral by 2026-12-08 or when the lint chain publishes a compatible patch.
