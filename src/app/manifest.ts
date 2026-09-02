import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Unbindall – CS2 Config Generator",
    short_name: "Unbindall",
    description: "CS2-Autoexecs erstellen, testen und speichern.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1d1a17",
    theme_color: "#e48717",
    categories: ["games", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
