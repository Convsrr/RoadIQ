import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RoadIQ — Visual driving judgement",
    short_name: "RoadIQ",
    description: "See the situation, make your call and compare with other drivers.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0B0C",
    theme_color: "#0B0B0C",
    orientation: "portrait-primary",
    categories: ["games", "automotive", "entertainment"],
    icons: [
      { src: "/icons/roadiq-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/roadiq-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/roadiq-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
