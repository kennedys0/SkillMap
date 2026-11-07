# AGENTS.md — MOCHI SkillMap

All agents MUST read this file before changes. Scope precedence: explicit human issue requirements > this project's governance files > agent defaults. If requirements conflict or are materially ambiguous, document and request an owner decision instead of silently broadening scope.

## Roles
- Hermes (leader): triage, delegate, track evidence, route reviews, hand off. In squad-leader mode do not implement code yourself.
- Codex: architecture, API, local filesystem reader, matching rules, tests, security verification.
- Antigravity: frontend, UI components, interaction states, accessibility, responsive design.
- Human owner: owns scope changes, production deployment, final merge, secret/access decisions.

## Delivery rules
1. Read issue, PRD, architecture, design, security, tests and task instructions.
2. Protect default branch. Use separate branch/worktree for implementation; no destructive filesystem commands.
3. Avoid simultaneous edits to the same files; coordinate handoffs using the issue's comments.
4. No fabricated business data, actual skills, test outcomes, screenshots, URLs or success claims.
5. Production UI must show real discovered skills or explicit empty/error states. Test fixtures may be synthetic in automated tests and clearly labeled as such.
6. Do not install surprise paid services or add network telemetry. Keep dependencies lean and record justification for new ones.
7. Run actual typecheck, lint, tests and build as available, and report commands, results and any inability to run checks.
8. No merge to protected branch, production deployment, scope expansion, or spending without human approval.
9. Follow project design direction and apply Taste Engine only if installed; don't pretend a missing skill was applied.
10. Keep decisions explicit and concise. Documentation should describe implemented reality, not aspirational state.

## Done means
Functional and reviewable application; requirements met with evidence; no unresolved critical security issues; human has an opportunity to review before merge.
