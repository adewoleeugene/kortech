"use server";

import type { OrgDocumentType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireArea } from "@/lib/auth/server";
import { storeOrgDocument } from "@/lib/business/documents";
import { getOrganisationForUser, isEditable, submitForVerification } from "@/lib/business/organisation";
import { getTranslator } from "@/lib/i18n/server";

export type ActionState = { error?: string; notice?: string };

const uploadSchema = z.object({
  type: z.enum(["REGISTRATION_CERTIFICATE", "LICENCE"]),
  file: z.instanceof(File),
});

export async function uploadDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireArea("business");
  const { t } = await getTranslator();

  const parsed = uploadSchema.safeParse({ type: formData.get("type"), file: formData.get("file") });
  if (!parsed.success || parsed.data.file.size === 0) return { error: t("business.errorMissingFile") };

  const org = await getOrganisationForUser(user.id);
  if (!org || !isEditable(org.status)) return { error: t("business.errorNotEditable") };

  const { file, type } = parsed.data;
  const result = await storeOrgDocument(org.id, type as OrgDocumentType, file.name, new Uint8Array(await file.arrayBuffer()));
  if (!result.ok) {
    const key = result.error === "too_large" ? "business.errorTooLarge" : result.error === "wrong_type" ? "business.errorWrongType" : "business.errorMissingFile";
    return { error: t(key) };
  }
  revalidatePath("/business");
  return { notice: t("business.uploadDone") };
}

export async function submitForVerificationAction(): Promise<ActionState> {
  const user = await requireArea("business");
  const { t } = await getTranslator();
  const result = await submitForVerification(user.id);
  if (!result.ok) {
    if (result.error === "missing_documents") {
      const docs = (result.missing ?? []).map((d) => t(`business.doc${d}`)).join(", ");
      return { error: t("business.errorMissingDocuments", { docs }) };
    }
    return { error: t("business.errorNotEditable") };
  }
  revalidatePath("/business");
  return {};
}
