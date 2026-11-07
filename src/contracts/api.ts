export type ScanStatus =
  | "ready"
  | "not_configured"
  | "invalid_root"
  | "unavailable";

export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  relativePath: string;
  tags: string[];
}

export interface ScanInfo {
  status: ScanStatus;
  skillCount: number;
  warningCount: number;
}

export type ApiWarningCode =
  | "MALFORMED_SKILL"
  | "OVERSIZED_SKILL"
  | "UNREADABLE_ENTRY"
  | "SCAN_LIMIT_REACHED";

export interface ApiWarning {
  code: ApiWarningCode;
  message: string;
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
