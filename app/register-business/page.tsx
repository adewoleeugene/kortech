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

export default async function RegisterBusinessPage() {
  const user = await requireUser("/register-business");
  const hasFarmerProfile = (await db.farmerProfile.count({ where: { userId: user.id } })) > 0;
  if (!canRegisterBusiness(user.role, hasFarmerProfile)) redirect("/forbidden");

  const [{ t }, districts, org] = await Promise.all([getTranslator(), listDistricts(), getOrganisationForUser(user.id)]);
  if (org && !isEditable(org.status)) redirect("/business");

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("registerBusiness.title")}</h1>
        <p className="text-muted">{t("registerBusiness.intro")}</p>
      </div>
      <RegisterForm
        districts={districts.map((d) => ({ id: d.id, name: d.name }))}
        defaults={{
          type: org?.type ?? "",
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
  );
}
