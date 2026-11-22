import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseStoredJson,
  readStorage,
  readStoredJson,
  removeStorage,
  writeStorage,
  writeStoredJson,
} from "@/lib/storage";

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("safe storage", () => {
  it("reads, writes, overwrites and removes values", () => {
    expect(readStorage("missing")).toBeNull();
    expect(writeStorage("key", "one")).toBe(true);
    expect(readStorage("key")).toBe("one");
    writeStorage("key", "two");
    expect(readStorage("key")).toBe("two");
    removeStorage("key");
    expect(readStorage("key")).toBeNull();
  });

  it("returns safe values when storage throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });

    expect(readStorage("key")).toBeNull();
    expect(writeStorage("key", "value")).toBe(false);
    expect(() => removeStorage("key")).not.toThrow();
  });

  it("returns defaults when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(readStorage("key")).toBeNull();
    expect(writeStorage("key", "value")).toBe(false);
    expect(readStoredJson("key", (value) => value as string, "fallback")).toBe("fallback");
  });

  it("parses JSON with a validating parser", () => {
    store.set("json", JSON.stringify({ version: 1, value: "ok" }));
    const parsed = readStoredJson(
      "json",
      (value) => {
        const record = value as { version?: number; value?: string };
        return record.version === 1 ? (record.value ?? null) : null;
      },
      "fallback",
    );
    expect(parsed).toBe("ok");
  });

  it("falls back for malformed JSON and rejected shapes", () => {
    store.set("json", "{not json");
    expect(parseStoredJson(store.get("json") ?? null, () => "ok", "fallback")).toBe("fallback");
    expect(readStoredJson("json", () => null, "fallback")).toBe("fallback");
    expect(parseStoredJson(null, () => "ok", "fallback")).toBe("fallback");
  });

  it("writes JSON values", () => {
    expect(writeStoredJson("json", { version: 1 })).toBe(true);
    expect(store.get("json")).toBe('{"version":1}');
  });
});
