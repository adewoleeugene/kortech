import type { Metadata } from "next";
import { requireArea } from "@/lib/auth/server";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Admin" };

// Placeholder until the verification queue lands in Milestone 3.
export default async function AdminHome() {
  await requireArea("admin");
  const { t } = await getTranslator();
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
      <p className="text-muted">{t("admin.intro")}</p>
      <p className="rounded-lg bg-surface px-4 py-3">{t("admin.comingSoon")}</p>
    </div>
  );
}
