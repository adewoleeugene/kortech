import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import Link from "next/link";
import { createTranslator, defaultLocale } from "@/lib/i18n";

export const metadata: Metadata = { title: "Offline" };
// Built once and saved by the service worker; shown for pages that aren't saved yet.
export const dynamic = "force-static";

const t = createTranslator(defaultLocale);

export default function OfflinePage() {
  return (
    <div className="space-y-4 py-10 text-center">
      <Icon name="wifiOff" size={56} className="mx-auto text-muted" />
      <h1 className="text-2xl font-bold">{t("offline.title")}</h1>
      <p className="text-muted">{t("offline.body")}</p>
      <Link href="/guides" className="inline-flex min-h-12 items-center rounded-lg bg-brand px-6 font-semibold text-brand-foreground">
        {t("offline.guides")}
      </Link>
    </div>
  );
}
