import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Instant-navigation validation runs by default with cacheComponents, but
    // this app hydrates auth from localStorage and gates workspace routes in
    // client layouts, so segments can't be validated for instant navigation
    // today. Only validate segments that explicitly opt in.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
