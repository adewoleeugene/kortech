import type { MetadataRoute } from "next";
import { createTranslator, defaultLocale } from "@/lib/i18n";

// PWA manifest (PRD 7). The service worker and offline caching arrive in Milestone 5.
export default function manifest(): MetadataRoute.Manifest {
  const t = createTranslator(defaultLocale);
  return {
    name: t("app.name"),
    short_name: t("app.shortName"),
    description: t("app.tagline"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#166534",
    lang: defaultLocale,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
