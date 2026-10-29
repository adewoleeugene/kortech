import "server-only";
import { redirect } from "next/navigation";
import { canVerifyOrganisations } from "./access";
import { requireArea } from "./server";

// For verification pages and actions: admin area AND the ADMIN role specifically.
export async function requireVerifier() {
  const user = await requireArea("admin");
  if (!canVerifyOrganisations(user.role)) redirect("/forbidden");
  return user;
}
