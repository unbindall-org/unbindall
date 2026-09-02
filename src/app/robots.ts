import type { MetadataRoute } from "next";
import { siteUrl } from "@/features/legal/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/moderation",
        "/einstellungen",
        "/papierkorb",
        "/configs/",
        "/community/new",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
