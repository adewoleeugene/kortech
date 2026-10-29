import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the e2e server build into its own folder while `npm run dev` is running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Verification documents are up to 5 MB (PRD 6.8); leave room for the form fields.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
