import type {
  ApiErrorResponse,
  MatchRequest,
  MatchResponse,
} from "@/src/contracts/api";
import { HttpRequestError, readJsonObject } from "@/src/server/http/request";
import {
  createFixedWindowRateLimiter,
  type RateLimiter,
} from "@/src/server/http/rate-limit";
import { matchSkills } from "@/src/server/match/matcher";
import {
  scanSkills,
  type ScanResult,
} from "@/src/server/skills/scanner";

const MAX_DESCRIPTION_CHARACTERS = 2_000;
const defaultLimiter = createFixedWindowRateLimiter({
  limit: 30,
  windowMs: 60_000,
});

interface MatchHandlerDependencies {
  scan?: () => Promise<ScanResult>;
  limiter?: RateLimiter;
}

function jsonResponse<T>(
  body: T,
  status: number,
  headers: HeadersInit = {},
): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store", ...headers },
  });
}

function validateMatchRequest(record: Record<string, unknown>): MatchRequest {
  const keys = Object.keys(record);
  const value = record.projectDescription;
  if (keys.length !== 1 || keys[0] !== "projectDescription" || typeof value !== "string") {
    throw new HttpRequestError(
      422,
      "INVALID_REQUEST",
      "projectDescription must be the only field and contain 1 to 2000 characters.",
    );
  }

  const projectDescription = value.trim();
  const characterCount = [...projectDescription].length;
  if (
    characterCount < 1 ||
    characterCount > MAX_DESCRIPTION_CHARACTERS
  ) {
    throw new HttpRequestError(
      422,
      "INVALID_REQUEST",
      "projectDescription must be the only field and contain 1 to 2000 characters.",
    );
  }

  return { projectDescription };
}

export function createMatchHandler({
  scan = scanSkills,
  limiter = defaultLimiter,
}: MatchHandlerDependencies = {}) {
  return async function match(request: Request): Promise<Response> {
    const rateLimit = limiter.check();
    if (!rateLimit.allowed) {
      const body: ApiErrorResponse = {
        error: {
          code: "RATE_LIMITED",
          message: "Too many match requests. Try again shortly.",
        },
      };
      return jsonResponse(body, 429, {
        "retry-after": String(rateLimit.retryAfterSeconds),
      });
    }

    try {
      const input = validateMatchRequest(await readJsonObject(request));
      const result = await scan();
      const body: MatchResponse = {
        data: {
          matches: matchSkills(input.projectDescription, result.skills),
          scan: result.scan,
        },
        warnings: result.warnings,
      };
      return jsonResponse(body, 200);
    } catch (error) {
      if (error instanceof HttpRequestError) {
        const body: ApiErrorResponse = {
          error: { code: error.code, message: error.message },
        };
        return jsonResponse(body, error.status);
      }

      const body: ApiErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to match local skills.",
        },
      };
      return jsonResponse(body, 500);
    }
  };
}
