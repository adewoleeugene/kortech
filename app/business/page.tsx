import type { Metadata } from "next";
import { requireArea } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Business portal" };

// Placeholder until organisation registration lands in Milestone 3.
export default async function BusinessHome() {
  await requireArea("business");
  const { t } = await getTranslator();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{t("business.title")}</h1>
      <p className="text-muted">{t("business.intro")}</p>
      <p className="rounded-lg bg-surface px-4 py-3">{t("business.comingSoon")}</p>
    </div>
  );
}
