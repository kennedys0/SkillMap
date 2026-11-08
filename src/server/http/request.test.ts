import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HttpRequestError,
  readJsonObject,
} from "@/src/server/http/request";

function request(body: string, contentType = "application/json"): Request {
  return new Request("http://localhost/api/match", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

async function assertRequestError(
  operation: Promise<unknown>,
  status: number,
  code: HttpRequestError["code"],
): Promise<void> {
  await assert.rejects(
    operation,
    (error) =>
      error instanceof HttpRequestError &&
      error.status === status &&
      error.code === code,
  );
}

describe("readJsonObject", () => {
  it("parses an application/json object", async () => {
    const result = await readJsonObject(request('{"projectDescription":"React"}'));

    assert.deepEqual(result, { projectDescription: "React" });
  });

  it("accepts an application/json charset parameter", async () => {
    const result = await readJsonObject(
      request('{"projectDescription":"React"}', "application/json; charset=utf-8"),
    );

    assert.deepEqual(result, { projectDescription: "React" });
  });

  it("rejects unsupported media types", async () => {
    await assertRequestError(
      readJsonObject(request("{}", "text/plain")),
      415,
      "UNSUPPORTED_MEDIA_TYPE",
    );
  });

  it("rejects malformed JSON and non-object JSON", async () => {
    await assertRequestError(
      readJsonObject(request("{")),
      422,
      "INVALID_REQUEST",
    );
    await assertRequestError(
      readJsonObject(request("[]")),
      422,
      "INVALID_REQUEST",
    );
  });

  it("rejects a body that exceeds the byte limit while streaming", async () => {
    await assertRequestError(
      readJsonObject(request(JSON.stringify({ value: "x".repeat(9_000) }))),
      413,
      "REQUEST_TOO_LARGE",
    );
  });

  it("rejects an oversized declared content length before reading", async () => {
    const oversized = new Request("http://localhost/api/match", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": "9000",
      },
      body: "{}",
    });

    await assertRequestError(
      readJsonObject(oversized),
      413,
      "REQUEST_TOO_LARGE",
    );
  });
});
