import type { Metadata } from "next";
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
  const pending = canVerify ? await db.organisation.count({ where: { status: "PENDING" } }) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <p className="text-muted">{t("admin.intro")}</p>
      </div>
      {canVerify ? (
        <Link href="/admin/organisations" className="flex min-h-16 items-center justify-between gap-3 rounded-lg border-2 border-border px-4 py-3 hover:border-brand">
          <span className="flex items-center gap-2 font-semibold">
            <span aria-hidden>🏢</span>
            {t("admin.verificationQueue")}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold">
            {t("admin.pendingCount", { count: pending })}
          </span>
        </Link>
      ) : null}
      {canVerify ? (
        <Link href="/admin/listings" className="flex min-h-16 items-center gap-2 rounded-lg border-2 border-border px-4 py-3 font-semibold hover:border-brand">
          <span aria-hidden>🧰</span>
          {t("admin.listings")}
        </Link>
      ) : (
        <p className="rounded-lg bg-surface px-4 py-3">{t("admin.verifierOnly")}</p>
      )}
    </div>
  );
}
