import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireVerifier } from "@/lib/auth/admin";
import { REQUIRED_FARMER_PHOTOS, getFarmerForReview, signedFarmerPhotoPath } from "@/lib/farmer/verification";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { FarmerDecisionForms } from "./decision-forms";

export const metadata: Metadata = { title: "Review farmer" };
export const dynamic = "force-dynamic";

export default async function ReviewFarmer({ params }: { params: Promise<{ id: string }> }) {
  await requireVerifier();
  const { id } = await params;
  const [{ locale, t }, farmer] = await Promise.all([getTranslator(), getFarmerForReview(id)]);
  if (!farmer) notFound();

  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const photosByType = new Map(farmer.photos.map((p) => [p.type, p]));
  const status = farmer.verificationStatus;
  const rows: [string, string][] = [
    [t("admin.phone"), formatPhoneForDisplay(farmer.user.phone)],
    [t("admin.district"), farmer.district.name],
    [t("farmer.chiefdom"), farmer.chiefdom?.name ?? "—"],
    [t("farmer.crops"), farmer.crops.map((c) => c.name).join(", ")],
    [t("farmer.farmSize"), farmer.farmSize ? `${farmer.farmSize} ${farmer.farmSizeUnit.toLowerCase()}` : "—"],
  ];

  return (
    <div className="space-y-8">
      <Link href={`/admin/farmers?status=${status === "NOT_SUBMITTED" ? "PENDING" : status}`} className="inline-flex min-h-12 items-center text-brand underline underline-offset-4">
        ← {t("admin.back")}
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{farmer.user.name ?? formatPhoneForDisplay(farmer.user.phone)}</h1>
        <p className="font-semibold">{t(`adminFarmers.status${status}`)}</p>
        {farmer.verifiedAt && status !== "PENDING" && (
          <p className="text-sm text-muted">{t("adminFarmers.decidedOn", { date: dateFormat.format(farmer.verifiedAt) })}</p>
        )}
        {status === "REJECTED" && farmer.rejectionReason && (
          <p className="text-sm"><span className="font-semibold">{t("admin.rejectionReason")}:</span> {farmer.rejectionReason}</p>
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
        <h2 className="text-lg font-semibold">{t("adminFarmers.photos")}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {REQUIRED_FARMER_PHOTOS.map((type) => {
            const photo = photosByType.get(type);
            return (
              <figure key={type} className="space-y-2">
                {photo ? (
                  <a href={signedFarmerPhotoPath(photo.id)} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element -- private, signed admin-only link */}
                    <img src={signedFarmerPhotoPath(photo.id)} alt={t(`photos.label${type}`)} className="aspect-square w-full rounded-xl border border-border object-cover" />
                  </a>
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-border font-semibold text-red-700 dark:text-red-300">
                    {t("admin.missingDocument")}
                  </div>
                )}
                <figcaption className="font-medium">{t(`photos.label${type}`)}</figcaption>
              </figure>
            );
          })}
        </div>
        <p className="text-sm text-muted">{t("adminFarmers.photoHelp")}</p>
      </section>

      {status === "PENDING" && (
        <FarmerDecisionForms
          userId={farmer.userId}
          labels={{
            approve: t("adminFarmers.approve"),
            reject: t("adminFarmers.reject"),
            reason: t("admin.rejectReason"),
            reasonHint: t("adminFarmers.rejectReasonHint"),
          }}
        />
      )}
    </div>
  );
}
