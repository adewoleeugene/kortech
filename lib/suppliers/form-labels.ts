import type { Translator } from "@/lib/i18n";
import { SUPPLIER_CATEGORIES } from "./listings";

// Labels for the listing form, shared by the new and edit pages.
export function listingFormLabels(t: Translator, editing: boolean) {
  return {
    categoryLabel: t("listings.categoryLabel"),
    categoryPlaceholder: t("listings.categoryPlaceholder"),
    titleLabel: t("listings.titleLabel"),
    titleHint: t("listings.titleHint"),
    descriptionLabel: t("listings.descriptionLabel"),
    descriptionHint: t("listings.descriptionHint"),
    priceLabel: t("listings.priceLabel"),
    priceHint: t("listings.priceHint"),
    unitLabel: t("listings.unitLabel"),
    unitHint: t("listings.unitHint"),
    districtsLabel: t("listings.districtsLabel"),
    districtsHint: t("listings.districtsHint"),
    contactPhoneLabel: t("listings.contactPhoneLabel"),
    whatsappLabel: t("listings.whatsappLabel"),
    photosLabel: t("listings.photosLabel"),
    photosHint: editing ? `${t("listings.photosHint")} ${t("listings.photosReplaceHint")}` : t("listings.photosHint"),
    save: t("listings.save"),
  };
}

export function categoryOptions(t: Translator) {
  return SUPPLIER_CATEGORIES.map((c) => ({ value: c, label: t(`suppliers.category_${c}`) }));
}
