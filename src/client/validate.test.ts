import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
  MAX_PROJECT_DESCRIPTION_LENGTH,
  validateProjectDescription,
} from "./validate";

describe("validateProjectDescription", () => {
  test("rejects empty string or whitespace only", () => {
    const emptyResult = validateProjectDescription("");
    assert.equal(emptyResult.valid, false);
    assert.equal(emptyResult.characterCount, 0);
    assert.ok(emptyResult.error);

    const spaceResult = validateProjectDescription("   \n\t  ");
    assert.equal(spaceResult.valid, false);
    assert.equal(spaceResult.characterCount, 0);
    assert.ok(spaceResult.error);
  });

  test("accepts valid brief within 1 to 2000 characters", () => {
    const brief = "We need an agent to build a React dashboard with MUI.";
    const result = validateProjectDescription(brief);
    assert.equal(result.valid, true);
    assert.equal(result.trimmedText, brief);
    assert.equal(result.characterCount, brief.length);
    assert.equal(result.error, undefined);
  });

  test("properly counts Unicode characters and trimmed length", () => {
    const inputWithSpaces = "  Hello 🚀 世界  ";
    const result = validateProjectDescription(inputWithSpaces);
    assert.equal(result.valid, true);
    assert.equal(result.trimmedText, "Hello 🚀 世界");
    assert.equal(result.characterCount, 10);
  });

  test("rejects input exceeding 2000 characters", () => {
    const tooLong = "a".repeat(MAX_PROJECT_DESCRIPTION_LENGTH + 1);
    const result = validateProjectDescription(tooLong);
    assert.equal(result.valid, false);
    assert.equal(result.characterCount, 2001);
    assert.ok(result.error?.includes("cannot exceed 2000"));
  });

  test("accepts input at exact boundary of 2000 characters", () => {
    const exactMax = "a".repeat(MAX_PROJECT_DESCRIPTION_LENGTH);
    const result = validateProjectDescription(exactMax);
    assert.equal(result.valid, true);
    assert.equal(result.characterCount, 2000);
  });
});
