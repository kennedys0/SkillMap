# Project Skill Pack Builder Design

The normative requirements are GitHub Issue #4, "[Project #003] Project Skill Pack Builder — Select, Assign, Save & Export," read in full on 2026-11-08. This document records the implementation calls needed to turn that issue into code; it does not broaden the issue.

## Intent

SkillMap will let one developer assemble references to real discovered skills, assign each reference to a role manually, retain named packs in the current browser, and exchange a pack as JSON or Markdown. Packs never install, copy, execute, modify, or certify a skill.

## Contract calls

- Schema: `SkillPackV1` with `schemaVersion: 1`, a UUID pack ID, a 1–120 character name, a 0–2,000 character project description, and source-specific selections.
- Identity: a selection stores `skillId`, `sourceId`, `relativePath`, and a sanitized `name` snapshot. Availability requires an exact current-catalog match for all four values; a same-named skill never substitutes for it.
- Roles: `codex`, `antigravity`, `hermes`, or `unassigned`. New selections start unassigned regardless of source provenance.
- Limits: 50 saved packs, 256 selections per pack, and 256 KiB per imported JSON file. Each source token follows the existing 64-character lowercase token rule; relative paths use `/`, remain below a source root, and may not contain empty, `.` or `..` segments.
- Persistence: localStorage key `mochi.skillmap.skill-packs.v1`, holding an exact versioned envelope. Unknown versions or malformed saved data fail closed and remain untouched so the user can recover/export raw browser data manually.
- Import: `.json` only in the UI. The parser checks UTF-8 byte size before `JSON.parse`, accepts exact fields only, rejects non-plain objects, duplicate selection references, HTML-like markup, control characters, likely credential material, absolute paths, traversal, and unsupported versions. Import preview never writes storage; confirmation does.
- Export: JSON field order and selection order are deterministic. Markdown escapes all imported/user text. Exports contain the allowlisted pack fields only and never scanner roots, skill contents, tokens, or other process data.
- Failure behavior: blocked/quota storage returns an actionable error while the in-memory draft remains exportable. No save action reports success before `setItem` completes.

## UI boundary

The client pack modules own validation, serialization, storage, and catalog reconciliation. React components consume those functions; they do not reimplement schema rules. Inventory and matcher entries expose explicit Add/Remove actions, while the selected workspace owns role changes, save/open/rename/delete, import preview, and downloads.

The UI keeps selected references across catalog rescans and marks mismatches unavailable. Matcher recommendations still clear on rescan, and deterministic scoring stays unchanged.

## Security and privacy

Imported JSON, localStorage, catalog metadata, and form text are untrusted. React text rendering remains escaped; no raw HTML API is allowed. Pack metadata and project descriptions stay on the device but can contain private project context, so the UI states what is retained and warns users not to enter secrets.

No server route, database, account, telemetry, cloud sync, model call, or filesystem write is added.
