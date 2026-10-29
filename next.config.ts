import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the e2e server build into its own folder while `npm run dev` is running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Verification documents are up to 5 MB (PRD 6.8); leave room for the form fields.
  experimental: { serverActions: { bodySizeLimit: "7mb" } },
  // Listing photos are served from /media and resized/compressed by next/image.
  images: {
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/icons/**" }],
    formats: ["image/webp"],
    deviceSizes: [360, 640, 828],
    imageSizes: [96, 160, 320],
  },
};

export default nextConfig;
