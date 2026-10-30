import type { OrgType, Role } from "@prisma/client";

// The account types people can choose at sign-in. Staff roles (admin, agronomist)
// are never self-chosen; Kortech assigns them.
export const ACCOUNT_TYPES = ["farmer", "supplier", "buyer", "lender"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export function parseAccountType(value: unknown): AccountType | null {
  return ACCOUNT_TYPES.find((type) => type === value) ?? null;
}

export function orgTypeFor(type: AccountType): OrgType | null {
  return type === "farmer" ? null : (type.toUpperCase() as OrgType);
}

export function accountTypeForRole(role: Role): AccountType | null {
  return parseAccountType(role.toLowerCase());
}
