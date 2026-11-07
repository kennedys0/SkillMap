# MOCHI SkillMap — Project #001

A small, real-world pilot for the **MOCHI Engineering Squad** in Multica: Hermes (lead), Codex (engineering), Antigravity (UI).

## Product
A local-first web app that reads installed `SKILL.md` files from a server-side directory explicitly chosen by the user, lists genuine skills, and explains which ones match a project brief using **deterministic keyword scoring**. No AI inference, no accounts, no remote scanning, no fabricated production data.

## Why this pilot?
- Tests squad delegation and handoffs across two specialist agents.
- Exercises filesystem/API safety, UI states, and quality review.
- Produces a small reusable developer tool.

## Preferred stack
Next.js App Router, TypeScript, Node.js runtime for filesystem access, MUI for interface primitives. No database for MVP. Versions should be selected from stable, compatible releases at implementation time; do not hardcode unverified versions.

## Multica setup
1. Create a new, preferably private, Git repository named `mochi-skillmap`.
2. Copy these starter files into the repository and push the initial commit. There is deliberately no implementation code yet; the squad is supposed to build it.
3. Create a Multica project with details from `MULTICA_PROJECT.md` and link this repo as a **Git repository resource** (prefer isolated worktrees).
4. Ensure Hermes, Codex and Antigravity (`agy` CLI, not just an IDE GUI) are online and authenticated in Runtimes.
5. Create the issue from `MULTICA_FIRST_ISSUE.md` in **Manual** issue mode. Assign it to `MOCHI Engineering Squad` only when ready to start; assigning a normal `todo` issue launches the squad leader.
6. Watch issue comments, run transcripts, changed files, tests, review status and handoff. Approve the PR yourself.

## Governance
Read `AGENTS.md`, `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `SECURITY.md`, `TESTING.md`, and `TASK_INSTRUCTION.md` before touching code. The project spec is intentionally minimal so agents can make reasonable implementation decisions **within scope**.

## Real data only
After the app exists, configure an actual local folder with `SKILLS_ROOT=/absolute/path/to/skills` in `.env.local`. Do not assume the user's skill directory or auto-scan the entire home directory. When absent or inaccessible, show an actionable empty/error state.

## Not implemented yet
This is a **project brief and governance starter kit**, not a completed runnable app. Agent execution and tests have not been performed.
