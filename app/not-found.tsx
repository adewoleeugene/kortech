import Link from "next/link";
import { getTranslator } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getTranslator();
  return (
    <div className="space-y-4 py-10 text-center">
      <h1 className="text-2xl font-bold">{t("errors.notFoundTitle")}</h1>
      <p className="text-muted">{t("errors.notFoundBody")}</p>
      <Link href="/" className="inline-flex min-h-12 items-center rounded-lg bg-brand px-6 font-semibold text-brand-foreground">
        {t("errors.backHome")}
      </Link>
    </div>
  );
}
