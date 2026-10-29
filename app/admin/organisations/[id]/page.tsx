import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVerifier } from "@/lib/auth/admin";
import { signedDocumentPath } from "@/lib/business/documents";
import { getOrganisationForReview, requiredDocuments } from "@/lib/business/organisation";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { DecisionForms } from "./decision-forms";

export const metadata: Metadata = { title: "Review organisation" };
export const dynamic = "force-dynamic";

export default async function ReviewOrganisation({ params }: { params: Promise<{ id: string }> }) {
  await requireVerifier();
  const { id } = await params;
  const [{ locale, t }, org] = await Promise.all([getTranslator(), getOrganisationForReview(id)]);
  if (!org) notFound();

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const owner = org.members[0]?.user;
  const docsByType = new Map(org.documents.map((d) => [d.type, d]));
  const docTypes = [...new Set([...requiredDocuments(org), ...docsByType.keys()])];
  const rows: [string, string][] = [
    [t("business.type"), t(`business.type${org.type}`)],
    [t("admin.registrationNumber"), org.regNumber],
    [t("admin.address"), org.address],
    [t("admin.district"), org.district.name],
    [t("admin.contact"), org.contactName],
    [t("admin.phone"), formatPhoneForDisplay(org.phone)],
    [t("admin.email"), org.email ?? "—"],
    ...(org.type === "SUPPLIER" ? [[t("admin.agrochemicals"), org.sellsAgrochemicals ? t("admin.yes") : t("admin.no")] as [string, string]] : []),
    [t("admin.account"), owner ? `${owner.name ?? ""} ${formatPhoneForDisplay(owner.phone)}`.trim() : "—"],
  ];

  return (
    <div className="space-y-8">
      <Link href={`/admin/organisations?status=${org.status === "DRAFT" ? "PENDING" : org.status}`} className="inline-flex min-h-12 items-center text-brand underline underline-offset-4">
        ← {t("admin.back")}
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{org.legalName}</h1>
        <p className="font-semibold" data-testid="org-status">{t(`business.status${org.status}`)}</p>
        {org.verifiedAt && org.verifiedBy && (
          <p className="text-sm text-muted">
            {t("admin.decidedBy", { name: org.verifiedBy.name ?? formatPhoneForDisplay(org.verifiedBy.phone), date: dateFormat.format(org.verifiedAt) })}
          </p>
        )}
        {org.status === "REJECTED" && org.rejectionReason && (
          <p className="text-sm"><span className="font-semibold">{t("admin.rejectionReason")}:</span> {org.rejectionReason}</p>
        )}
      </div>

      <dl className="divide-y divide-border rounded-lg border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 px-4 py-3">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("admin.documents")}</h2>
        <ul className="divide-y divide-border rounded-lg border border-border">
          {docTypes.map((type) => {
            const doc = docsByType.get(type);
            return (
              <li key={type} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                <span>
                  <span className="block font-medium">{t(`business.doc${type}`)}</span>
                  {doc && <span className="block text-sm text-muted">{doc.fileName} · {Math.ceil(doc.sizeBytes / 1024)} KB</span>}
                </span>
                {doc ? (
                  <a href={signedDocumentPath(doc.id)} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
                    {t("admin.openDocument")}
                  </a>
                ) : (
                  <span className="font-semibold text-red-700 dark:text-red-300">{t("admin.missingDocument")}</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">{t("admin.documentLinkHelp")}</p>
      </section>

      {org.status === "PENDING" && (
        <DecisionForms
          orgId={org.id}
          labels={{
            approve: t("admin.approve"),
            reject: t("admin.reject"),
            reason: t("admin.rejectReason"),
            reasonHint: t("admin.rejectReasonHint"),
          }}
        />
      )}
    </div>
  );
}
