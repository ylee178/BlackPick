import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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

export default withNextIntl(nextConfig);
