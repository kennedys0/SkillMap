# MOCHI SkillMap

SkillMap is a local-only catalog for installed agent skills. It reads metadata from real `SKILL.md` files under one directory, then ranks those skills against a project description with exact keyword scoring. It doesn't send file content or project descriptions to an external service.

The repository contains the Next.js/MUI scaffold, the complete scanner, parser, matcher, API layer, and the responsive skills inventory and deterministic project brief matcher UI.

## Run it locally

Requirements: Node.js 20.9 or newer and npm 10.

```bash
npm ci
```

Create `.env.local` and point `SKILLS_ROOT` at an absolute directory that contains skill folders:

```dotenv
SKILLS_ROOT=/absolute/path/to/skills
```

Start the local development server with `npm run dev`; stop it with Ctrl-C. The project scripts bind to `127.0.0.1` by default. This MVP has no authentication and must not be exposed to the public internet.

If `SKILLS_ROOT` is absent, relative, the filesystem root, the home directory itself, a symlink, missing, or unreadable, the API returns a non-sensitive scanner state instead of choosing a fallback path.

## API

`GET /api/skills` returns sanitized skill summaries, scan state, and safe warnings. `POST /api/match` accepts this body:

```json
{
  "projectDescription": "A project description between 1 and 2000 characters"
}
```

The canonical TypeScript DTOs live in `src/contracts/api.ts`. Route modules run in the Node.js runtime and disable response caching.

The scanner reads regular files named exactly `SKILL.md`. It skips symlinks, limits traversal to 6 directory levels, examines at most 500 candidates, and reads no more than 256 KiB from one candidate. Returned paths stay relative to `SKILLS_ROOT`.

Matching normalizes text with Unicode NFKC, lowercases it, removes punctuation, and drops common English plus generic project words. Name matches score 3, tag matches score 2, and description matches score 1; a term contributes only its highest field weight. Results sort by score, skill name, then stable skill ID. The API returns exact matched terms and a plain-language reason, never a confidence percentage.

`POST /api/match` caps JSON bodies at 8 KiB and permits 30 requests per 60-second process window. The limiter suits this single-process local app; it isn't a distributed deployment control.

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
