import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { locales, defaultLocale } from "@/i18n/locales";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const paths = [
    { path: "", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/events", changeFrequency: "daily" as const, priority: 0.9 },
    { path: "/ranking", changeFrequency: "daily" as const, priority: 0.8 },
    { path: "/fighters", changeFrequency: "weekly" as const, priority: 0.7 },
    { path: "/terms", changeFrequency: "yearly" as const, priority: 0.2 },
    { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.2 },
  ];

  return paths.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: now,
      changeFrequency,
      priority: locale === defaultLocale ? priority : priority * 0.9,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [l, `${baseUrl}/${l}${path}`]),
        ),
      },
    })),
  );
}
