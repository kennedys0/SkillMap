# Issue 001 — Deliver MOCHI SkillMap MVP end to end

**Assign to:** MOCHI Engineering Squad (Hermes leads)  
**Project:** MOCHI SkillMap — Local Skill Discovery & Matching  
**Initial status:** Todo (assignment starts a run), or Backlog if not ready yet  
**Priority:** Medium

## Goal
Deliver a runnable, working local-first MVP of MOCHI SkillMap in the project's linked Git repository. Verify the three-agent collaboration process in Multica. Do not return only a plan or a static UI.

## Required features
1. Configure one explicit local absolute directory through `SKILLS_ROOT` on the server. Do not pick an arbitrary directory supplied by a browser request.
2. Discover `SKILL.md` files beneath that root within safe, documented traversal bounds. Parse name and description from valid frontmatter if present and use a documented fallback for missing metadata. Treat the files as untrusted data.
3. Display a real skill inventory, with skill name, description when available and a safe relative source path or source label. Provide client-side keyword search/filter.
4. Provide a multiline project-description input. Match project terms against the discovered skill metadata using deterministic, explainable rules. Show ordered results **with exact matched terms/reasons**, not invented confidence percentages. If nothing matches, say so.
5. Support responsive desktop and mobile layouts, accessible keyboard controls, and honest loading, empty, invalid configuration, and failure states.
6. Include a README with local setup, environment variable configuration, test commands, security limitations, and example *text input* (not fake skill catalog data).

## Explicitly out of scope
Authentication, user accounts, paid providers, AI-based matching, embedding models, OCR, syncing with third-party services, automatic modifying/installing skills, database, telemetry, production deployment, reading arbitrary local file content, scanning the full machine, or adding hardcoded sample skills to production screens.

## Delegation guidance for Hermes
- First inspect repo instructions and project resources. Confirm `codex`, `agy`, and `hermes` are available. Note any runtime/tooling blocker honestly.
- Delegate **stage A to Codex**: scaffold application; define and document skill DTO / API contract; implement bounded, read-only scanner and matcher; write automated tests and implementation notes. Ask Codex to commit work on its branch, and report paths, commands, and results.
- After the contract and scaffold are available in a branch/checkout Antigravity can access, delegate **stage B to Antigravity**: implement the MUI-based responsive frontend against the actual contract. Require clear search, loading, empty, error, and match-explanation states. Do not fabricate APIs or sample skills.
- Delegate **stage C to Codex** for integration review, backend safety verification, tests, and build. Require Antigravity to complete a frontend accessibility / UX review of the final integrated UI, when possible.
- Do not let two agents modify the same file concurrently without isolated branches/worktrees and a merge plan. Do not claim checks passed without logs.
- Summarize implementation, evidence, limitations, and PR for human review. Do not merge or deploy without explicit approval.

## Acceptance criteria
- [ ] App starts locally using documented steps; build, typecheck and tests have recorded results.
- [ ] The app lists only actual SKILL.md files from the configured directory.
- [ ] Missing or empty SKILLS_ROOT does not trigger a home-directory scan and displays an actionable state.
- [ ] A valid project description produces explainable results; unrelated text produces an honest 'no matches' state.
- [ ] No discovered skill content is executed or rendered as unsafe HTML.
- [ ] Search/filter and matching work on mobile and desktop; keyboard navigation and feedback states are usable.
- [ ] No secrets, real tokens or sensitive absolute paths leak to the browser or repository.
- [ ] Repository includes README, source code, tests, and updated docs where the implementation differs from initial design.
- [ ] Hermes posts a concise handoff report naming responsible agents, actual test commands/outcomes, known limitations and PR/diff links.
- [ ] Changes remain unmerged pending human review.

## Expected final handoff
PR(s) or reviewable branches, setup commands, verified test results, a short feature demo description based on real execution, and any unresolved blockers. Never invent screenshots, test results, or a deployment URL.
