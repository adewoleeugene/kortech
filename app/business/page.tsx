import type { Metadata } from "next";
import { Icon } from "@/components/icons";
import { RegisteredAsNotice } from "@/components/registered-as-notice";
import Link from "next/link";
import { requireArea } from "@/lib/auth/server";
import { getOrganisationForUser, isEditable, requiredDocuments } from "@/lib/business/organisation";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { DocumentUploadForm, SubmitForVerificationForm } from "./business-forms";

export const metadata: Metadata = { title: "Business portal" };

const STATUS_STYLE = {
  DRAFT: "bg-surface",
  PENDING: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  APPROVED: "bg-brand-soft",
  REJECTED: "bg-red-100 text-red-950 dark:bg-red-950 dark:text-red-100",
} as const;

export default async function BusinessHome({ searchParams }: { searchParams: Promise<{ registeredAs?: string }> }) {
  const { registeredAs } = await searchParams;
  const user = await requireArea("business");
  const [{ t }, org] = await Promise.all([getTranslator(), getOrganisationForUser(user.id)]);
  if (!org) return null;

  const editable = isEditable(org.status);
  const required = requiredDocuments(org);
  const docsByType = new Map(org.documents.map((d) => [d.type, d]));
  const details: [string, string][] = [
    [t("business.type"), t(`business.type${org.type}`)],
    [t("admin.registrationNumber"), org.regNumber],
    [t("admin.address"), org.address],
    [t("admin.district"), org.district.name],
    [t("admin.contact"), org.contactName],
    [t("admin.phone"), formatPhoneForDisplay(org.phone)],
  ];

  return (
    <div className="space-y-8">
      <RegisteredAsNotice registeredAs={registeredAs} />
      <div className="space-y-1">
        <p className="text-muted">{t("business.title")}</p>
        <h1 className="text-2xl font-bold">{org.legalName}</h1>
      </div>

      <section aria-labelledby="status-heading" className={`space-y-2 rounded-lg px-4 py-4 ${STATUS_STYLE[org.status]}`}>
        <h2 id="status-heading" className="text-sm font-semibold uppercase tracking-wide">{t("business.status")}</h2>
        <p className="text-xl font-bold" data-testid="org-status">{t(`business.status${org.status}`)}</p>
        {org.status === "DRAFT" && <p>{t("business.draftHelp")}</p>}
        {org.status === "PENDING" && <p>{t("business.pendingHelp")}</p>}
        {org.status === "APPROVED" && org.type === "SUPPLIER" && (
          <Link href="/business/listings" className="inline-flex min-h-12 items-center rounded-lg bg-brand px-5 font-semibold text-brand-foreground">
            {t("listings.manage")}
          </Link>
        )}
        {org.status === "APPROVED" && org.type !== "SUPPLIER" && <p>{t("business.approvedHelp")}</p>}
        {org.status === "REJECTED" && (
          <>
            <p>{t("business.rejectedHelp")}</p>
            <blockquote className="border-l-4 border-current pl-3 font-medium">{org.rejectionReason}</blockquote>
            <p>{t("business.rejectedFix")}</p>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("business.details")}</h2>
        <dl className="divide-y divide-border rounded-lg border border-border">
          {details.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {editable && (
          <Link href="/register-business" className="inline-flex min-h-12 items-center font-semibold text-brand underline underline-offset-4">
            {t("business.editDetails")}
          </Link>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("business.documents")}</h2>
        <p className="text-sm text-muted">{t("business.documentsHelp")}</p>
        <ul className="space-y-3">
          {required.map((type) => {
            const doc = docsByType.get(type);
            const label = t(`business.doc${type}`);
            return (
              <li key={type} className="space-y-2 rounded-lg border border-border px-4 py-3">
                <p className="font-semibold">{label}</p>
                {type === "LICENCE" && <p className="text-sm text-muted">{t("business.docLicenceHelp")}</p>}
                <p className="text-sm" data-testid={`doc-${type}`}>
                  {doc ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-brand"><Icon name="check" size={16} /> {t("business.uploaded", { name: doc.fileName })}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted"><Icon name="file" size={16} /> {t("business.notUploaded")}</span>
                  )}
                </p>
                {editable && (
                  <DocumentUploadForm
                    type={type}
                    label={label}
                    chooseFileLabel={t("business.chooseFile")}
                    buttonLabel={doc ? t("business.replace") : t("business.upload")}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {editable && <SubmitForVerificationForm label={t("business.submit")} />}
    </div>
  );
}
