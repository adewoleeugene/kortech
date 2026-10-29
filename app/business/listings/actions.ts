"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireArea } from "@/lib/auth/server";
import type { TranslationKey } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n/server";
import {
  type ListingField,
  type ListingInput,
  type PhotoUpload,
  type SaveListingResult,
  createListing,
  setListingActive,
  updateListing,
} from "@/lib/suppliers/listings";

export type ListingFormState = { error?: string; fieldErrors?: Partial<Record<ListingField, string>> };

const FIELD_ERROR_KEYS: Record<ListingField, TranslationKey> = {
  category: "listings.errorCategory",
  title: "listings.errorTitle",
  description: "listings.errorDescription",
  price: "listings.errorPrice",
  unit: "listings.errorUnit",
  districtIds: "listings.errorDistricts",
  contactPhone: "listings.errorContactPhone",
  whatsappNumber: "listings.errorWhatsapp",
  photos: "listings.errorPhotos",
};

function readInput(formData: FormData): ListingInput {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    category: text("category") as ListingInput["category"],
    title: text("title"),
    description: text("description"),
    price: text("price"),
    unit: text("unit"),
    districtIds: formData.getAll("districtIds").map(String),
    contactPhone: text("contactPhone"),
    whatsappNumber: text("whatsappNumber"),
  };
}

async function readPhotos(formData: FormData): Promise<PhotoUpload[]> {
  // An empty file input still sends one empty File.
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  return Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
}

async function toState(result: SaveListingResult): Promise<ListingFormState> {
  if (result.ok) {
    revalidatePath("/business/listings");
    revalidatePath("/suppliers");
    redirect("/business/listings");
  }
  const { t } = await getTranslator();
  switch (result.error) {
    case "invalid":
      return { fieldErrors: Object.fromEntries(result.fields.map((f) => [f, t(FIELD_ERROR_KEYS[f])])) };
    case "agrochemicals_not_licensed":
      return { fieldErrors: { category: t("listings.errorAgrochemicals") } };
    case "not_found":
      return { error: t("listings.errorNotFound") };
    default:
      return { error: t("listings.notApproved") };
  }
}

export async function createListingAction(_prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const user = await requireArea("business");
  return toState(await createListing(user.id, readInput(formData), await readPhotos(formData)));
}

export async function updateListingAction(listingId: string, _prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const user = await requireArea("business");
  const id = z.string().min(1).max(50).parse(listingId);
  return toState(await updateListing(user.id, id, readInput(formData), await readPhotos(formData)));
}

export async function setListingActiveAction(formData: FormData) {
  const user = await requireArea("business");
  const id = z.string().min(1).max(50).parse(formData.get("listingId"));
  await setListingActive(user.id, id, formData.get("active") === "true");
  revalidatePath("/business/listings");
  revalidatePath("/suppliers");
}
