import type { MetadataRoute } from "next";
import { siteUrl } from "@/features/legal/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/register`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/community`, changeFrequency: "daily", priority: 0.7 },
  ];
}
