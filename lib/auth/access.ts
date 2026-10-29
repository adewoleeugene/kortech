import type { Role } from "@prisma/client";

// Which roles may open each area of the app (PRD 4, 6.1). Enforced on the server
// in each area's layout and again in every server action / API route.
export type Area = "farmer" | "business" | "admin";

const AREA_ROLES: Record<Area, readonly Role[]> = {
  farmer: ["FARMER"],
  business: ["SUPPLIER", "BUYER", "LENDER"],
  admin: ["ADMIN", "AGRONOMIST"],
};

export function canAccess(role: Role, area: Area): boolean {
  return AREA_ROLES[area].includes(role);
}

// Where a user lands after signing in.
export function homePathForRole(role: Role): string {
  if (canAccess(role, "admin")) return "/admin";
  if (canAccess(role, "business")) return "/business";
  return "/farmer";
}

// Prevent open redirects: only allow same-site absolute paths.
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
