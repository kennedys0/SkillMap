import assert from "node:assert/strict";
import test, { describe } from "node:test";

import {
  MAX_SAVED_SKILL_PACKS,
  SKILL_PACK_STORAGE_KEY,
  type SkillPackV1,
} from "@/src/contracts/skill-pack";
import { loadSkillPacks, saveSkillPacks, type StorageLike } from "./storage";

function pack(index = 1): SkillPackV1 {
  return {
    schemaVersion: 1,
    id: `018f6a6b-5f16-7a22-9f84-${index.toString(16).padStart(12, "0")}`,
    name: `Pack ${index}`,
    projectDescription: "Local project.",
    selections: [],
  };
}

function memoryStorage(initial: string | null = null): StorageLike & { value: string | null; reads: number; writes: number } {
  return {
    value: initial,
    reads: 0,
    writes: 0,
    getItem(key) {
      assert.equal(key, SKILL_PACK_STORAGE_KEY);
      this.reads += 1;
      return this.value;
    },
    setItem(key, value) {
      assert.equal(key, SKILL_PACK_STORAGE_KEY);
      this.writes += 1;
      this.value = value;
    },
  };
}

describe("skill pack storage", () => {
  test("loads an empty collection when storage has no value", () => {
    const storage = memoryStorage();

    assert.deepEqual(loadSkillPacks(storage), { ok: true, packs: [] });
    assert.equal(storage.reads, 1);
    assert.equal(storage.writes, 0);
  });

  test("round-trips multiple packs with one write and one read", () => {
    const storage = memoryStorage();
    const packs = [pack(1), pack(2)];

    assert.deepEqual(saveSkillPacks(storage, packs), { ok: true });
    assert.deepEqual(loadSkillPacks(storage), { ok: true, packs });
    assert.equal(storage.writes, 1);
    assert.equal(storage.reads, 1);
  });

  test("accepts exactly the configured pack limit", () => {
    const storage = memoryStorage();
    const packs = Array.from({ length: MAX_SAVED_SKILL_PACKS }, (_, index) => pack(index + 1));

    assert.deepEqual(saveSkillPacks(storage, packs), { ok: true });
    assert.equal(storage.writes, 1);
  });

  test("rejects a collection above the configured pack limit without writing", () => {
    const storage = memoryStorage();
    const packs = Array.from({ length: MAX_SAVED_SKILL_PACKS + 1 }, (_, index) => pack(index + 1));
    const result = saveSkillPacks(storage, packs);

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "TOO_MANY_PACKS");
    assert.equal(storage.writes, 0);
  });

  for (const [name, stored] of [
    ["unsupported envelope", JSON.stringify({ schemaVersion: 2, packs: [] })],
    ["unknown envelope fields", JSON.stringify({ schemaVersion: 1, packs: [], extra: true })],
    ["corrupt JSON", "{"],
  ] as const) {
    test(`fails closed for ${name} without overwriting it`, () => {
      const storage = memoryStorage(stored);
      const result = loadSkillPacks(storage);

      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.code, "INVALID_STORED_DATA");
      assert.equal(storage.value, stored);
      assert.equal(storage.writes, 0);
    });
  }

  test("surfaces a blocked storage read", () => {
    const storage: StorageLike = {
      getItem() {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem() {},
    };
    const result = loadSkillPacks(storage);

    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "STORAGE_READ_FAILED");
  });

  test("surfaces quota failures and never reports a false save", () => {
    const storage: StorageLike = {
      getItem() {
        return null;
      },
      setItem() {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    const result = saveSkillPacks(storage, [pack()]);

    assert.deepEqual(result, {
      ok: false,
      error: {
        code: "STORAGE_WRITE_FAILED",
        message: "Skill packs could not be saved in this browser.",
      },
    });
  });
});
