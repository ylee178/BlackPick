import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  return [
    { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/events`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/ranking`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/fighters`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
