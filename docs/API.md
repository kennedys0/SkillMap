# SkillMap API contract

`src/contracts/api.ts` is canonical. Both routes run in the Node.js runtime, use same-origin requests, and return `cache-control: no-store`. All paths in successful payloads are relative to a configured source; absolute roots are never serialized.

## Shared DTOs

```ts
export type ScanStatus =
  | "ready"
  | "partial"
  | "not_configured"
  | "invalid_configuration"
  | "invalid_root"
  | "unavailable";

export type SkillSourceScanStatus =
  | "ready"
  | "invalid_root"
  | "unavailable"
  | "skipped";

export interface SkillSourceScanInfo {
  id: string;
  label: string;
  agent: string;
  status: SkillSourceScanStatus;
  count: number;
}

export interface ScanConfigurationError {
  code:
    | "INVALID_JSON"
    | "INVALID_SOURCE_LIST"
    | "INVALID_SOURCE"
    | "DUPLICATE_SOURCE_ID";
  message: string;
}

export interface ScanInfo {
  status: ScanStatus;
  skillCount: number;
  warningCount: number;
  sources: SkillSourceScanInfo[];
  configurationError?: ScanConfigurationError;
}

export interface SkillSummary {
  id: string;
  sourceId: string;
  name: string;
  description: string;
  relativePath: string;
  tags: string[];
}

export type ApiWarningCode =
  | "MALFORMED_SKILL"
  | "OVERSIZED_SKILL"
  | "UNREADABLE_ENTRY"
  | "SCAN_LIMIT_REACHED"
  | "AGGREGATE_SCAN_LIMIT_REACHED";

export interface ApiWarning {
  code: ApiWarningCode;
  message: string;
  sourceId: string;
  relativePath?: string;
}
```

`agent` is a grouping/provenance category, not a compatibility guarantee. `shared` is the neutral category. Source `count` is the number of valid skills returned from that source.

Top-level `ready` means every configured source was scanned under the guardrails. `partial` means at least one source produced a usable result while another failed or the aggregate guardrail stopped discovery. `invalid_configuration` is fail-closed and returns no source roots or skills. Per-source `skipped` means the aggregate candidate limit prevented that source from being scanned completely.

## `GET /api/skills`

No request body.

```ts
export interface SkillsResponse {
  data: {
    skills: SkillSummary[];
    scan: ScanInfo;
  };
  warnings: ApiWarning[];
}
```

Skills sort by normalized name, source ID, then relative path. IDs are stable for the same source ID and relative path and remain distinct across sources.

## `POST /api/match`

The request must be `application/json`, no larger than 8 KiB, and contain exactly one field:

```ts
export interface MatchRequest {
  projectDescription: string; // 1–2,000 Unicode code points after trim
}

export interface SkillMatch {
  skillId: string;
  score: number;
  matchedTerms: string[];
  reason: string;
}

export interface MatchResponse {
  data: {
    matches: SkillMatch[];
    scan: ScanInfo;
  };
  warnings: ApiWarning[];
}
```

`skillId` is the source-specific `SkillSummary.id`. Name terms weigh 3, tags 2, and description terms 1; each exact normalized term contributes only its highest field weight. Results sort by score descending, then skill name and ID ascending. `matchedTerms` and `reason` report exact contributing terms; no confidence percentage is calculated or returned.

The local process permits 30 match requests per 60 seconds. Rate-limit state is process-local and is not a distributed deployment control.

## Errors

```ts
export interface ApiErrorResponse {
  error: {
    code:
      | "INVALID_REQUEST"
      | "UNSUPPORTED_MEDIA_TYPE"
      | "REQUEST_TOO_LARGE"
      | "RATE_LIMITED"
      | "INTERNAL_ERROR";
    message: string;
  };
}
```

Expected scanner problems are represented in a successful response's `scan` and `warnings`. Unexpected route failures use generic error messages and never include stack traces, raw filesystem errors, file contents, or configured roots.
