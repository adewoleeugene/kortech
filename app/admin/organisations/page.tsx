import type { OrgStatus } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";
import { requireVerifier } from "@/lib/auth/admin";
import { listOrganisationsByStatus } from "@/lib/business/organisation";
import { getTranslator } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Business verification" };

const TABS = ["PENDING", "APPROVED", "REJECTED"] as const satisfies readonly OrgStatus[];

export default async function VerificationQueue({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireVerifier();
  const { status: raw } = await searchParams;
  const status = TABS.find((s) => s === raw) ?? "PENDING";
  const [{ locale, t }, orgs] = await Promise.all([getTranslator(), listOrganisationsByStatus(status)]);
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.verificationQueue")}</h1>

      <nav aria-label={t("admin.verificationQueue")} className="flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/admin/organisations?status=${tab}`}
            aria-current={tab === status ? "page" : undefined}
            className="inline-flex min-h-12 items-center rounded-lg border-2 border-border px-4 font-semibold aria-[current=page]:border-brand aria-[current=page]:bg-brand-soft"
          >
            {t(`admin.tab${tab}`)}
          </Link>
        ))}
      </nav>

      {orgs.length === 0 ? (
        <p className="text-muted">{t("admin.noOrganisations")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {orgs.map((org) => (
            <li key={org.id}>
              <Link href={`/admin/organisations/${org.id}`} className="block min-h-14 px-4 py-3 hover:bg-surface">
                <span className="block font-semibold">{org.legalName}</span>
                <span className="block text-sm text-muted">
                  {t(`business.type${org.type}`)} · {org.district.name}
                  {org.submittedAt && ` · ${t("admin.submitted", { date: dateFormat.format(org.submittedAt) })}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
