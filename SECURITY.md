# Security — MOCHI SkillMap MVP

This app reads developer-local files. Treat filenames and content as untrusted even in a local-only setup.

Requirements:
- Explicit, server-only `SKILLS_ROOT`; never scan the home directory or root filesystem as a fallback.
- Reject or safely handle missing, relative, prohibited or nonexistent roots. Do not return unredacted absolute paths to browser.
- Restrict discovery to bounded `SKILL.md` metadata; avoid following symlinks and escaping configured root.
- File limits (depth, count and bytes); skip unsupported or oversized entries. No execution of skill definitions, embedded commands, scripts, shell examples or markdown HTML.
- API request validation with bounded project-description length; no shell interpolation or `eval`.
- Do not leak stack traces, tokens or other files in logs/API responses.
- No network service exposure by default. Do not recommend public internet deployment without a separate authentication and threat-model review.
- No third-party telemetry; no automatic upload of project descriptions or skill content.

Review checks:
- Test symlink escape, unreadable path, malformed frontmatter, oversized file, empty root, missing env, HTML-in-metadata, and long project description.
- Inspect any new dependencies and document relevant trust assumptions.
