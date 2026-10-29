"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireVerifier } from "@/lib/auth/admin";
import { setListingHidden, setListingSponsored } from "@/lib/suppliers/listings";

const schema = z.object({
  listingId: z.string().min(1).max(50),
  change: z.enum(["sponsor", "unsponsor", "hide", "restore"]),
});

export async function moderateListingAction(formData: FormData) {
  const admin = await requireVerifier();
  const { listingId, change } = schema.parse({ listingId: formData.get("listingId"), change: formData.get("change") });
  if (change === "sponsor" || change === "unsponsor") await setListingSponsored(admin.id, listingId, change === "sponsor");
  else await setListingHidden(admin.id, listingId, change === "hide");
  revalidatePath("/admin/listings");
  revalidatePath("/suppliers");
}
