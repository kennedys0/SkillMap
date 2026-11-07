import type {
  ApiErrorResponse,
  SkillsResponse,
} from "@/src/contracts/api";
import {
  scanSkills,
  type ScanResult,
} from "@/src/server/skills/scanner";

type ScanFunction = () => Promise<ScanResult>;

function jsonResponse<T>(body: T, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function createGetSkillsHandler(scan: ScanFunction = scanSkills) {
  return async function getSkills(): Promise<Response> {
    try {
      const result = await scan();
      const body: SkillsResponse = {
        data: { skills: result.skills, scan: result.scan },
        warnings: result.warnings,
      };
      return jsonResponse(body, 200);
    } catch {
      const body: ApiErrorResponse = {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unable to scan local skills.",
        },
      };
      return jsonResponse(body, 500);
    }
  };
}
