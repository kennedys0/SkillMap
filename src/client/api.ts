import type {
  ApiErrorResponse,
  MatchRequest,
  MatchResponse,
  SkillsResponse,
} from "@/src/contracts/api";

export class ClientApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.code = code;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let errorMessage = `Request failed with status ${response.status}`;
  let errorCode: string | undefined;

  try {
    const errorBody = (await response.json()) as ApiErrorResponse;
    if (errorBody?.error?.message) {
      errorMessage = errorBody.error.message;
      errorCode = errorBody.error.code;
    }
  } catch {
    // If not JSON, use the HTTP status text or fallback
    if (response.statusText) {
      errorMessage = response.statusText;
    }
  }

  throw new ClientApiError(response.status, errorMessage, errorCode);
}

/**
 * Fetches the local skills catalog from GET /api/skills
 */
export async function fetchSkills(
  customFetch: typeof fetch = fetch,
): Promise<SkillsResponse> {
  const response = await customFetch("/api/skills", {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return handleResponse<SkillsResponse>(response);
}

/**
 * Matches a project brief against local skills via POST /api/match
 */
export async function matchSkills(
  projectDescription: string,
  customFetch: typeof fetch = fetch,
): Promise<MatchResponse> {
  const payload: MatchRequest = { projectDescription };

  const response = await customFetch("/api/match", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  return handleResponse<MatchResponse>(response);
}
