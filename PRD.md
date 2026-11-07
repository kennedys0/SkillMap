# PRD — MOCHI SkillMap MVP

## Problem
Developers install reusable agent skills across local tools and forget which skills exist or fit a new project. They need a small discoverable catalog and an understandable first-pass matcher without paying for AI or indexing private files remotely.

## Audience
Single developer on their own computer in a trusted local environment.

## Jobs to be done
- See which declared `SKILL.md` files exist in an allowed local directory.
- Search by visible skill name or description.
- Describe a project and see which existing skills may be relevant, and why.
- Understand when no local skill folder is configured or no match exists.

## Scope
- One `SKILLS_ROOT` server-side absolute directory.
- Read-only discovery of `SKILL.md` (case-sensitive is acceptable if documented), not arbitrary file types.
- Metadata: name, description, safe relative path, optional tags if reliably available.
- Deterministic matcher with documented normalization, stop-word handling and score ordering. Exact matched terms are shown to explain results. No confidence percent.
- Web UI for inventory, search and a project description form.
- Accessibility and responsive desktop/mobile.
- Loading, configuration missing, empty directory, malformed file and unexpected error states.

## Non-goals
Accounts, AI prompts/generation, automatic skill installation, modifying user skill files, auto-discovery of all agent tool roots, network search, database, multi-user SaaS, publishing, analytics and production deployment.

## Acceptance examples
- When the configured folder has two valid skills, the catalog contains those two, not made-up entries.
- When no folder is configured, the UI explains how to set SKILLS_ROOT.
- When a project description shares zero meaningful metadata terms with all skills, no recommendation is shown.
- When a skill file is malformed, the app handles it gracefully and reports a non-sensitive warning.

## MVP constraints
No remote transmission of skill content. No hidden demo records in production data. Avoid adding software complexity for speculative future features.
