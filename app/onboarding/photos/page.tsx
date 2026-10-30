import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { REQUIRED_FARMER_PHOTOS, needsFarmerPhotos } from "@/lib/farmer/verification";
import { getTranslator } from "@/lib/i18n/server";
import { PhotosForm } from "./photos-form";

export const metadata: Metadata = { title: "Photo evidence" };

// Step 2 of farmer onboarding: farm photo, ID card and selfie, reviewed by an admin.
export default async function OnboardingPhotosPage() {
  const user = await requireUser("/onboarding/photos");
  if (!canAccess(user.role, "farmer")) redirect("/forbidden");
  const profile = await db.farmerProfile.findUnique({ where: { userId: user.id }, include: { photos: { select: { type: true } } } });
  if (!profile) redirect("/onboarding");
  if (!needsFarmerPhotos(profile.verificationStatus)) redirect("/farmer");

  const { t } = await getTranslator();
  const have = new Set(profile.photos.map((p) => p.type));

  return (
    <div>
      <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted">{t("photos.step")}</p>
          <h1 className="text-3xl font-bold">{t("photos.title")}</h1>
          <p className="text-muted">{t("photos.intro")}</p>
        </div>
        {profile.verificationStatus === "REJECTED" && profile.rejectionReason && (
          <p role="alert" className="rounded-lg border border-red-700 bg-red-50 px-4 py-3 text-red-800 dark:bg-red-950 dark:text-red-200">
            <span className="font-semibold">{t("photos.rejected")}</span> {profile.rejectionReason}
          </p>
        )}
        <PhotosForm
          fields={REQUIRED_FARMER_PHOTOS.map((type) => ({
            type,
            label: t(`photos.label${type}`),
            hint: t(`photos.hint${type}`),
            done: have.has(type),
          }))}
          submitLabel={t("photos.submit")}
          replaceLabel={t("photos.alreadySent")}
        />
        <p className="text-sm text-muted">{t("photos.privacy")}</p>
      </div>
    </div>
  );
}
