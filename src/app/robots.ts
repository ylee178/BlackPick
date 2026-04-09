import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/env";
import { isProductionApp } from "@/lib/app-env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  const isProduction = isProductionApp();

  return {
    rules: {
      userAgent: "*",
      allow: isProduction ? "/" : undefined,
      disallow: isProduction ? ["/api/", "/admin/", "/terminal/"] : "/",
    },
    sitemap: isProduction ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
