import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    instantInsights: {
      // Every page here is cookie-gated, so instant-navigation validation
      // would fail on the auth redirect during its validation render.
      // Only validate segments that explicitly opt in via `instant`.
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    // Pin the workspace root to this project so Turbopack does not wander
    // up to the home directory (which has a stray package-lock.json).
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
