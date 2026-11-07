# Multica Project Setup — Project #001

**Name:** MOCHI SkillMap — Local Skill Discovery & Matching

**Description (paste into Multica Project Description):**

Build a small local-first developer tool that discovers real AI skill definitions in explicitly configured local directories, displays a searchable catalog, and suggests relevant skills for a text project brief using deterministic, explainable matching. The deliverable is a working responsive Next.js + TypeScript web app, not only a mockup. Use MUI for interface primitives and follow the project's DESIGN.md; apply Taste Engine only if actually installed and compatible with the project design direction.

Squad: HERMES — Tech Lead (coordination), CODEX — Software Engineer (architecture, filesystem scanning, API, matching, tests), ANTIGRAVITY — UI Engineer (frontend, responsive experience, accessibility). Human product owner approves pull requests and any production deployment.

Constraints: Never fabricate actual skills or recommendation results. Do not scan the user's home directory or filesystem by default; read only SKILL.md files under an explicitly configured SKILLS_ROOT. Never execute discovered skill content. No AI API, authentication, cloud service, database, paid service, or production deployment in the MVP. Keep work sequential wherever files/dependencies overlap. Record relevant commands and test evidence. Follow AGENTS.md, PRD.md, ARCHITECTURE.md, DESIGN.md, SECURITY.md, TESTING.md and TASK_INSTRUCTION.md in the linked repo.

Success: an owner can set SKILLS_ROOT, run the app locally, view the real indexed skills, search skills, enter a project brief and see ranked relevant results with clear matching reasons, or clear empty/error states when no skills match.

**Recommended project fields:**
- Status: Planned (change to In Progress once the first issue starts)
- Priority: Medium
- Project lead: human owner; Hermes is the *squad* leader
- Workflow: Default for the first pilot, with manual human sign-off
- Resource: dedicated `mochi-skillmap` Git repository
- Start/target dates: leave unset unless the human defines them

**Create first issue:** Copy `MULTICA_FIRST_ISSUE.md`. Do not create redundant child issues in advance; allow Hermes to decide and delegate work. If the leader cannot create sub-issues, it may coordinate through comments or explicit agent mentions supported by Multica.
