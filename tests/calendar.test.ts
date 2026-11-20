import { afterEach, describe, expect, it, vi } from "vitest";
import { buildIcs, cleanWindowEvent, downloadIcs } from "@/lib/calendar";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("calendar export", () => {
  it("builds a valid floating-time event", () => {
    const content = buildIcs(
      cleanWindowEvent({
        city: "Delhi",
        label: "2 PM–4 PM",
        start: "2026-11-20T14:00",
        end: "2026-11-20T16:00",
        aqi: 180,
        scale: "Indian NAQI",
      }),
    );
    expect(content).toContain("BEGIN:VCALENDAR");
    expect(content).toContain("DTSTART:20261120T140000");
    expect(content).toContain("SUMMARY:Saans: cleaner air window in Delhi");
    expect(content).toContain("END:VCALENDAR");
  });

  it("rejects an unusable start date", () => {
    expect(
      buildIcs({
        title: "Test",
        description: "Test",
        start: "not-a-date",
      }),
    ).toBeNull();
  });

  it("downloads an ICS file through a temporary anchor", () => {
    const click = vi.fn();
    const anchor = {
      href: "",
      download: "",
      click,
      remove: vi.fn(),
    };
    vi.stubGlobal("window", {
      setTimeout: (callback: () => void) => callback(),
    });
    vi.stubGlobal("document", {
      createElement: () => anchor,
      body: { appendChild: vi.fn() },
    });
    vi.stubGlobal("URL", {
      createObjectURL: () => "blob:test",
      revokeObjectURL: vi.fn(),
    });
    vi.stubGlobal(
      "Blob",
      class {
        constructor(public parts: unknown[], public options: unknown) {}
      },
    );

    downloadIcs("plan", "BEGIN:VCALENDAR");
    expect(anchor.download).toBe("plan.ics");
    expect(click).toHaveBeenCalledTimes(1);
  });
});
