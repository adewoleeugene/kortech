import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { OfflineSupport } from "@/components/offline-support";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TabBar } from "@/components/tab-bar";
import { getCurrentUser } from "@/lib/auth/server";
import { createTranslator, defaultLocale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";
import "./globals.css";

// Self-hosted by Next.js at build time (no request to Google from farmers' phones), subset to Latin.
const figtree = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-figtree", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-bricolage", display: "swap" });

const t = createTranslator(defaultLocale);

export const metadata: Metadata = {
  title: { default: t("app.name"), template: `%s · ${t("app.shortName")}` },
  description: t("app.tagline"),
  applicationName: t("app.shortName"),
  appleWebApp: { capable: true, title: t("app.shortName"), statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#146b3a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [{ locale, t }, user] = await Promise.all([getTranslator(), getCurrentUser()]);
  return (
    <html lang={locale} className={`${figtree.variable} ${bricolage.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
        >
          {t("nav.skipToContent")}
        </a>
        <OfflineSupport bannerText={t("offline.banner")} />
        <SiteHeader t={t} user={user} />
        {/* Each page's top element gets a centred column; pages opt into "wide" (dashboards, lists) or "bleed" (full-width hero). */}
        <main
          id="main"
          className="flex-1 [&>*]:mx-auto [&>*]:w-full [&>*]:max-w-3xl [&>*]:px-4 [&>*]:py-6 sm:[&>*]:px-5 [&>.wide]:max-w-6xl [&>.bleed]:max-w-none [&>.bleed]:p-0"
        >
          {children}
        </main>
        <SiteFooter t={t} />
        {user?.role === "FARMER" && <TabBar t={t} />}
      </body>
    </html>
  );
}
