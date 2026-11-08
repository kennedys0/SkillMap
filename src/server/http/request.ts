import type { ApiErrorCode } from "@/src/contracts/api";

const DEFAULT_MAX_BODY_BYTES = 8 * 1_024;

export class HttpRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

async function readBoundedBody(
  request: Request,
  maxBodyBytes: number,
): Promise<Uint8Array> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    throw new HttpRequestError(
      413,
      "REQUEST_TOO_LARGE",
      "Request body exceeds the 8192-byte limit.",
    );
  }

  if (!request.body) {
    return new Uint8Array();
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maxBodyBytes) {
      await reader.cancel().catch(() => undefined);
      throw new HttpRequestError(
        413,
        "REQUEST_TOO_LARGE",
        "Request body exceeds the 8192-byte limit.",
      );
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readJsonObject(
  request: Request,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") {
    throw new HttpRequestError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json.",
    );
  }

  let parsed: unknown;
  try {
    const body = await readBoundedBody(request, maxBodyBytes);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(body);
    parsed = JSON.parse(text);
  } catch (error) {
    if (error instanceof HttpRequestError) {
      throw error;
    }
    throw new HttpRequestError(
      422,
      "INVALID_REQUEST",
      "Request body must be a valid JSON object.",
    );
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpRequestError(
      422,
      "INVALID_REQUEST",
      "Request body must be a valid JSON object.",
    );
  }

  return parsed as Record<string, unknown>;
}
