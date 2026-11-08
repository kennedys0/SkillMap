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

export type ScanConfigurationErrorCode =
  | "INVALID_JSON"
  | "INVALID_SOURCE_LIST"
  | "INVALID_SOURCE"
  | "DUPLICATE_SOURCE_ID";

export interface ScanConfigurationError {
  code: ScanConfigurationErrorCode;
  message: string;
}

export interface SkillSummary {
  id: string;
  sourceId: string;
  name: string;
  description: string;
  relativePath: string;
  tags: string[];
}

export interface ScanInfo {
  status: ScanStatus;
  skillCount: number;
  warningCount: number;
  sources: SkillSourceScanInfo[];
  configurationError?: ScanConfigurationError;
}

export type ApiWarningCode =
  | "MALFORMED_SKILL"
  | "OVERSIZED_SKILL"
  | "UNREADABLE_ENTRY"
  | "SCAN_LIMIT_REACHED";

export interface ApiWarning {
  code: ApiWarningCode;
  message: string;
  sourceId: string;
  relativePath?: string;
}

export interface SkillsResponse {
  data: {
    skills: SkillSummary[];
    scan: ScanInfo;
  };
  warnings: ApiWarning[];
}

export interface MatchRequest {
  projectDescription: string;
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

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "REQUEST_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}
