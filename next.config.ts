import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
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
