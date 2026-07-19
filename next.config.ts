import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Product images on the Pro Shop cards (components/shop/ShopCardImage)
    // can point at Supabase Storage, which next/image refuses to load unless
    // the host is listed here. Host matches NEXT_PUBLIC_SUPABASE_URL.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "speakingpro.online",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Configuring `localPatterns` at all REPLACES Next's built-in default
    // (`[{pathname: '**', search: ''}]`, which allows every local image but
    // no query string) rather than extending it -- so both entries below are
    // required. Without the first, every other local next/image (stickers,
    // logo, /record's env photos) gets rejected by the optimizer, not just
    // ones with a query string.
    localPatterns: [
      // Preserve the default: every local path, no query string.
      { pathname: "**", search: "" },
      // Except /img/shop/**, which app/(focus)/pro-shop/page.tsx
      // cache-busts with ?v=<mtime> so overwriting a product image changes
      // its URL and invalidates the optimizer's and the browser's cache. No
      // `search` key here -- Next matches it as an exact string, not a glob,
      // so a wildcard could never match the real mtime value; omitting it
      // allows any query string, which is fine since this is our own static
      // folder, not user-controlled input.
      { pathname: "/img/shop/**" },
    ],
  },
  experimental: {
    // Serve force-dynamic pages from the client Router Cache for 30s so
    // back/forward navigation between recently-visited pages is instant
    // instead of re-fetching from Supabase every time.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
