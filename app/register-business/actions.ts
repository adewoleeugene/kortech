"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/server";
import { type OrganisationField, saveOrganisation } from "@/lib/business/organisation";
import type { TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";

export type RegisterState = { error?: string; fieldErrors?: Partial<Record<OrganisationField, string>> };

const FIELD_ERROR_KEYS: Record<OrganisationField, TranslationKey> = {
  type: "registerBusiness.errorType",
  legalName: "registerBusiness.errorLegalName",
  regNumber: "registerBusiness.errorRegNumber",
  address: "registerBusiness.errorAddress",
  districtId: "registerBusiness.errorDistrict",
  contactName: "registerBusiness.errorContactName",
  phone: "registerBusiness.errorPhone",
  email: "registerBusiness.errorEmail",
  sellsAgrochemicals: "registerBusiness.errorType",
};

export async function saveOrganisationAction(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const user = await requireUser("/register-business");
  const { t } = await getTranslator();

  const result = await saveOrganisation(user.id, {
    type: String(formData.get("type") ?? "") as "SUPPLIER",
    legalName: String(formData.get("legalName") ?? ""),
    regNumber: String(formData.get("regNumber") ?? ""),
    address: String(formData.get("address") ?? ""),
    districtId: String(formData.get("districtId") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    sellsAgrochemicals: formData.get("sellsAgrochemicals") === "on",
  });

  if (result.ok) redirect("/business");
  if (result.error !== "invalid") {
    return { error: t(result.error === "farmer_account" ? "registerBusiness.errorFarmerAccount" : "registerBusiness.errorNotEditable") };
  }
  return { fieldErrors: Object.fromEntries(result.fields.map((f) => [f, t(FIELD_ERROR_KEYS[f])])) };
}
