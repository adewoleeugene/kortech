import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canAccess } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { getFarmerProfile } from "@/lib/farmer/profile";
import { getTranslator } from "@/lib/i18n/server";
import { listCrops } from "@/lib/reference";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Your farm" };

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  if (!canAccess(user.role, "farmer")) redirect("/forbidden");

  const [{ t }, districts, crops, profile] = await Promise.all([
    getTranslator(),
    db.district.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, chiefdoms: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
    }),
    listCrops(),
    getFarmerProfile(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("onboarding.title")}</h1>
        <p className="text-muted">{t("onboarding.intro")}</p>
      </div>
      <OnboardingForm
        districts={districts}
        crops={crops.map((c) => ({ id: c.id, name: c.name }))}
        defaults={{
          name: user.name ?? "",
          districtId: profile?.districtId ?? "",
          chiefdomId: profile?.chiefdomId ?? "",
          cropIds: profile?.crops.map((c) => c.id) ?? [],
          farmSize: profile?.farmSize?.toString() ?? "",
          farmSizeUnit: profile?.farmSizeUnit ?? "ACRE",
        }}
        labels={{
          nameLabel: t("onboarding.nameLabel"),
          districtLabel: t("onboarding.districtLabel"),
          districtPlaceholder: t("onboarding.districtPlaceholder"),
          chiefdomLabel: t("onboarding.chiefdomLabel"),
          chiefdomPlaceholder: t("onboarding.chiefdomPlaceholder"),
          chiefdomHint: t("onboarding.chiefdomHint"),
          cropsLabel: t("onboarding.cropsLabel"),
          cropsHint: t("onboarding.cropsHint"),
          farmSizeLabel: t("onboarding.farmSizeLabel"),
          unitLabel: t("onboarding.unitLabel"),
          unitAcre: t("onboarding.unitAcre"),
          unitHectare: t("onboarding.unitHectare"),
          save: t("onboarding.save"),
        }}
      />
    </div>
  );
}
