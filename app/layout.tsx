import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { OfflineSupport } from "@/components/offline-support";
import { SiteHeader } from "@/components/site-header";
import { createTranslator, defaultLocale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";
import "./globals.css";

const t = createTranslator(defaultLocale);

export const metadata: Metadata = {
  title: { default: t("app.name"), template: `%s · ${t("app.shortName")}` },
  description: t("app.tagline"),
  applicationName: t("app.shortName"),
  appleWebApp: { capable: true, title: t("app.shortName"), statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#166534",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getTranslator();
  return (
    <html lang={locale}>
      <body className="flex min-h-dvh flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground"
        >
          {t("nav.skipToContent")}
        </a>
        <OfflineSupport bannerText={t("offline.banner")} />
        <SiteHeader t={t} />
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
          {children}
        </main>
        <SiteFooter t={t} />
      </body>
    </html>
  );
}
