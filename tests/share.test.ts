import { describe, expect, it } from "vitest";
import { buildShareLinks, buildShareText, shareUrl } from "@/lib/share";

const CONTENT = {
  title: "Patna, Bihar",
  scaleLabel: "Indian NAQI",
  value: 283,
  label: "Poor",
  windowLabel: "2–4 PM",
  tagline: "A family air copilot for smog season.",
};

describe("share helpers", () => {
  it("builds a short, readable message", () => {
    const text = buildShareText(CONTENT);
    expect(text).toBe(
      "Patna, Bihar — Indian NAQI 283 (Poor). Cleanest window: 2–4 PM. A family air copilot for smog season.",
    );
    expect(text.length).toBeLessThanOrEqual(280);
  });

  it("omits the window when one is not known", () => {
    const text = buildShareText({ ...CONTENT, windowLabel: undefined });
    expect(text).not.toContain("Cleanest window");
  });

  it("resolves paths against the origin", () => {
    expect(shareUrl("https://example.com", "/dashboard?city=patna")).toBe(
      "https://example.com/dashboard?city=patna",
    );
    expect(shareUrl("https://example.com/", "/")).toBe("https://example.com/");
  });

  it("encodes text and url for every platform", () => {
    const links = buildShareLinks("PM2.5 & CO₂ — 50%", "https://example.com/dashboard?city=patna");

    expect(links.whatsapp.startsWith("https://wa.me/?text=")).toBe(true);
    expect(links.x.startsWith("https://twitter.com/intent/tweet?")).toBe(true);
    expect(links.telegram.startsWith("https://t.me/share/url?")).toBe(true);

    for (const link of Object.values(links)) {
      expect(link).not.toContain(" ");
      expect(link).not.toContain("—");
    }

    expect(decodeURIComponent(links.x)).toContain("https://example.com/dashboard?city=patna");
    expect(decodeURIComponent(links.telegram)).toContain("PM2.5 & CO₂ — 50%");
    expect(decodeURIComponent(links.whatsapp)).toContain("PM2.5 & CO₂ — 50%");
  });

  it("encodes Devanagari without mangling it", () => {
    const links = buildShareLinks("पटना — 283", "https://example.com/");
    expect(decodeURIComponent(links.telegram)).toContain("पटना");
  });
});
