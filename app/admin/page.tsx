import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import Link from "next/link";
import { canVerifyOrganisations } from "@/lib/auth/access";
import { requireArea } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminHome() {
  const user = await requireArea("admin");
  const { t } = await getTranslator();
  const canVerify = canVerifyOrganisations(user.role);
  const [pending, pendingFarmers, aiOpen] = await Promise.all([
    canVerify ? db.organisation.count({ where: { status: "PENDING" } }) : 0,
    canVerify ? db.farmerProfile.count({ where: { verificationStatus: "PENDING" } }) : 0,
    db.aiMessage.count({ where: { role: "ASSISTANT", reviewStatus: "OPEN" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <p className="text-muted">{t("admin.intro")}</p>
      </div>
      {canVerify ? (
        <Link href="/admin/organisations" className="flex min-h-16 items-center justify-between gap-3 rounded-lg border-2 border-border px-4 py-3 hover:border-brand">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="building" className="text-brand" />
            {t("admin.verificationQueue")}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold">
            {t("admin.pendingCount", { count: pending })}
          </span>
        </Link>
      ) : null}
      {canVerify ? (
        <Link href="/admin/farmers" className="flex min-h-16 items-center justify-between gap-3 rounded-lg border-2 border-border px-4 py-3 hover:border-brand">
          <span className="flex items-center gap-2 font-semibold">
            <Icon name="sprout" className="text-brand" />
            {t("adminFarmers.queue")}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold">
            {t("admin.pendingCount", { count: pendingFarmers })}
          </span>
        </Link>
      ) : null}
      <Link href="/admin/ai" className="flex min-h-16 items-center justify-between gap-3 rounded-lg border-2 border-border px-4 py-3 hover:border-brand">
        <span className="flex items-center gap-2 font-semibold">
          <Icon name="chat" className="text-brand" />
          {t("admin.aiReview")}
        </span>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold">
          {t("admin.aiOpenCount", { count: aiOpen })}
        </span>
      </Link>
      <Link href="/admin/guides" className="flex min-h-16 items-center gap-2 rounded-lg border-2 border-border px-4 py-3 font-semibold hover:border-brand">
        <Icon name="book" className="text-brand" />
        {t("admin.guides")}
      </Link>
      {canVerify ? (
        <Link href="/admin/listings" className="flex min-h-16 items-center gap-2 rounded-lg border-2 border-border px-4 py-3 font-semibold hover:border-brand">
          <Icon name="store" className="text-brand" />
          {t("admin.listings")}
        </Link>
      ) : (
        <p className="rounded-lg bg-surface px-4 py-3">{t("admin.verifierOnly")}</p>
      )}
    </div>
  );
}
