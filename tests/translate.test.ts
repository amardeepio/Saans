import { afterEach, describe, expect, it, vi } from "vitest";
import { isTranslationConfigured, translateTexts } from "@/lib/translate";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("optional translation", () => {
  it("reports unconfigured translation without calling a provider", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");
    expect(isTranslationConfigured()).toBe(false);
    await expect(translateTexts(["hello"], "hi")).resolves.toBeNull();
  });

  it("translates and reuses cached strings", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: "नमस्ते" }] },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    expect(isTranslationConfigured()).toBe(true);
    await expect(translateTexts(["hello"], "hi")).resolves.toEqual(["नमस्ते"]);
    await expect(translateTexts(["hello"], "hi")).resolves.toEqual(["नमस्ते"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns null when the provider fails", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
    );
    await expect(translateTexts(["a fresh string"], "hi")).resolves.toBeNull();
  });
});
