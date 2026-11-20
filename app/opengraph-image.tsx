import { ImageResponse } from "next/og";

export const alt = "Saans — a family air copilot for smog season";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4efe4",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 999,
              background: "#143c31",
              color: "#d9f36a",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            s
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 38, fontWeight: 700, color: "#143c31", letterSpacing: -1 }}>
              saans.
            </div>
            <div style={{ fontSize: 20, color: "#5d6b60", letterSpacing: 3, textTransform: "uppercase" }}>
              Family air copilot
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 86,
              lineHeight: 1.05,
              color: "#143c31",
              fontWeight: 600,
              letterSpacing: -2,
              maxWidth: 920,
            }}
          >
            A clearer day, one choice at a time.
          </div>
          <div style={{ fontSize: 30, color: "#40534a", maxWidth: 860, lineHeight: 1.35 }}>
            Practical, location-aware plans for smoky seasons — the school run, the kitchen, the
            commute, the bedroom.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px 26px",
              borderRadius: 999,
              background: "#d9f36a",
              color: "#0d2a22",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            Live AQI · Weather · Household plan
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#5d6b60" }}>
            India · no account needed
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
