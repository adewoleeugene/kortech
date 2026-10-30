import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canRegisterBusiness } from "@/lib/auth/access";
import { requireUser } from "@/lib/auth/server";
import { getOrganisationForUser, isEditable } from "@/lib/business/organisation";
import { db } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/server";
import { formatPhoneForDisplay } from "@/lib/phone";
import { listDistricts } from "@/lib/reference";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register your organisation" };

const ORG_TYPES = ["SUPPLIER", "BUYER", "LENDER"] as const;

export default async function RegisterBusinessPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await requireUser("/register-business");
  // The business type chosen at sign-in (?type=SUPPLIER|BUYER|LENDER) is preselected.
  const { type: requestedType } = await searchParams;
  const chosenType = ORG_TYPES.find((type) => type === requestedType) ?? "";
  const hasFarmerProfile = (await db.farmerProfile.count({ where: { userId: user.id } })) > 0;
  if (!canRegisterBusiness(user.role, hasFarmerProfile)) redirect("/forbidden");

  const [{ t }, districts, org] = await Promise.all([getTranslator(), listDistricts(), getOrganisationForUser(user.id)]);
  if (org && !isEditable(org.status)) redirect("/business");

  return (
    <div>
      <div className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-border bg-surface p-6 sm:p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t("registerBusiness.title")}</h1>
        <p className="text-muted">{t("registerBusiness.intro")}</p>
      </div>
      <RegisterForm
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
        defaults={{
          type: org?.type ?? chosenType,
          legalName: org?.legalName ?? "",
          regNumber: org?.regNumber ?? "",
          address: org?.address ?? "",
          districtId: org?.districtId ?? "",
          contactName: org?.contactName ?? user.name ?? "",
          phone: formatPhoneForDisplay(org?.phone ?? user.phone),
          email: org?.email ?? "",
          sellsAgrochemicals: org?.sellsAgrochemicals ?? false,
        }}
        labels={{
          typeLabel: t("registerBusiness.typeLabel"),
          typeSUPPLIER: t("registerBusiness.typeSUPPLIER"),
          typeBUYER: t("registerBusiness.typeBUYER"),
          typeLENDER: t("registerBusiness.typeLENDER"),
          legalNameLabel: t("registerBusiness.legalNameLabel"),
          regNumberLabel: t("registerBusiness.regNumberLabel"),
          addressLabel: t("registerBusiness.addressLabel"),
          districtLabel: t("registerBusiness.districtLabel"),
          districtPlaceholder: t("registerBusiness.districtPlaceholder"),
          contactNameLabel: t("registerBusiness.contactNameLabel"),
          phoneLabel: t("registerBusiness.phoneLabel"),
          phoneHint: t("registerBusiness.phoneHint"),
          emailLabel: t("registerBusiness.emailLabel"),
          agrochemicalsLabel: t("registerBusiness.agrochemicalsLabel"),
          agrochemicalsHint: t("registerBusiness.agrochemicalsHint"),
          save: t("registerBusiness.save"),
        }}
      />
      </div>
    </div>
  );
}
