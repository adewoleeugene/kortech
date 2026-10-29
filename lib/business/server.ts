import "server-only";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth/server";
import { getOrganisationForUser } from "./organisation";

// For supplier listing pages: signed-in business user with a supplier organisation.
export async function requireSupplierOrganisation() {
  const user = await requireArea("business");
  const org = await getOrganisationForUser(user.id);
  if (!org) redirect("/register-business");
  return { user, org };
}
