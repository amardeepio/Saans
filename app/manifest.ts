import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saans — family air copilot",
    short_name: "Saans",
    description:
      "Location-aware air-quality plans, indoor-air guidance and a grounded assistant for smog season.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe4",
    theme_color: "#143c31",
    orientation: "portrait-primary",
    categories: ["health", "weather", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
