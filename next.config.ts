import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
    globalNotFound: true,
  },
  async headers() {
    return [
      {
        // Fighter pixel avatars are static PNGs served from public/. Without
        // explicit Cache-Control they get Next's default no-cache, forcing a
        // revalidate on every fighter page render. Fighter pages load many
        // avatars at once, so this was a meaningful render-path cost.
        //
        // Strategy: browser cache 1 day, CDN serves stale while revalidating
        // for a week. After an admin regenerates an avatar, FighterImageManager
        // appends a `?v=<timestamp>` to the URL which acts as a cache buster.
        source: "/fighters/pixel/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry last so webpack sees the final next-intl config.
// Source maps / release tracking are driven by env vars injected by the
// Sentry-Vercel Marketplace integration (SENTRY_AUTH_TOKEN / SENTRY_ORG /
// SENTRY_PROJECT). Locally + on CI without those envs, the plugin no-ops
// source-map upload but leaves the runtime SDK intact.
export default withSentryConfig(withNextIntl(nextConfig), {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Expand source-map upload to include files outside /_next/static so the
  // server bundle is covered too.
  widenClientFileUpload: true,
});
