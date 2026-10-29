import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the e2e server build into its own folder while `npm run dev` is running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
