# Security — MOCHI SkillMap MVP

This app reads developer-local files. Treat filenames and content as untrusted even in a local-only setup.

Requirements:
- Explicit, server-only `SKILL_SOURCES_JSON`, with at most 16 exact source objects, or legacy `SKILLS_ROOT` only when the JSON variable is absent. Never accept paths from the browser.
- Treat malformed-present JSON as a fail-closed configuration error; never fall through to `SKILLS_ROOT`, the home directory, current working directory, or another implicit root.
- Reject or safely handle duplicate IDs and missing, relative, prohibited, symlinked or nonexistent roots. Do not return unredacted absolute paths to the browser.
- Restrict discovery to bounded `SKILL.md` metadata; avoid following symlinks and escaping configured root.
- File limits: 6 levels, 500 candidates and 256 KiB per candidate per root; 2,000 candidates in aggregate. Once aggregate exhaustion is encountered, stop and expose skipped source states. No execution of skill definitions, embedded commands, scripts, shell examples or markdown HTML.
- API request validation with bounded project-description length; no shell interpolation or `eval`.
- Do not leak stack traces, tokens or other files in logs/API responses.
- No network service exposure by default. Do not recommend public internet deployment without a separate authentication and threat-model review.
- No third-party telemetry; no automatic upload of project descriptions or skill content.
- Skill Pack Security: imported manifests, localStorage data, and user text are treated as untrusted. Files must not exceed 256 KiB; validation strictly rejects `__proto__`/prototype-pollution keys, unknown fields, HTML/markup, Windows drive paths, path traversals, and potential credential patterns. No filesystem writes or server routes are introduced for pack management. React escaping is preserved across all renders; Markdown exports strictly escape syntax characters. Users are advised never to enter private credentials or tokens into project descriptions.

Review checks:
- Test malformed multi-source configuration without fallback, duplicate source IDs/names, partial root failure, per-root and aggregate limits, ID stability, symlink escape, unreadable/protected paths, malformed frontmatter, oversized files, empty configuration, HTML-in-metadata, long project descriptions, and payloads without absolute roots.
- Inspect any new dependencies and document relevant trust assumptions.
