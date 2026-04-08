import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  const isProduction = process.env.NODE_ENV === "production"
    && !process.env.VERCEL_ENV?.startsWith("preview");

  return {
    rules: {
      userAgent: "*",
      allow: isProduction ? "/" : undefined,
      disallow: isProduction ? ["/api/", "/admin/", "/terminal/"] : "/",
    },
    sitemap: isProduction ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
