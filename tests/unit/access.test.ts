import type { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { type Area, canAccess, homePathForRole, safeNextPath } from "@/lib/auth/access";

const matrix: [Role, Record<Area, boolean>][] = [
  ["FARMER", { farmer: true, business: false, admin: false }],
  ["SUPPLIER", { farmer: false, business: true, admin: false }],
  ["BUYER", { farmer: false, business: true, admin: false }],
  ["LENDER", { farmer: false, business: true, admin: false }],
  ["ADMIN", { farmer: false, business: false, admin: true }],
  ["AGRONOMIST", { farmer: false, business: false, admin: true }],
];

describe("canAccess", () => {
  it.each(matrix)("%s", (role, expected) => {
    for (const area of Object.keys(expected) as Area[]) {
      expect(canAccess(role, area), `${role} -> ${area}`).toBe(expected[area]);
    }
  });

  it("a farmer cannot open admin or business areas", () => {
    expect(canAccess("FARMER", "admin")).toBe(false);
    expect(canAccess("FARMER", "business")).toBe(false);
  });
});

describe("homePathForRole", () => {
  it("sends each role to its own area", () => {
    expect(homePathForRole("FARMER")).toBe("/farmer");
    expect(homePathForRole("LENDER")).toBe("/business");
    expect(homePathForRole("AGRONOMIST")).toBe("/admin");
  });
});

describe("safeNextPath", () => {
  it("allows same-site paths", () => {
    expect(safeNextPath("/business")).toBe("/business");
    expect(safeNextPath("/farmer?tab=1")).toBe("/farmer?tab=1");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "farmer", "", null, undefined])(
    "rejects %s",
    (value) => {
      expect(safeNextPath(value)).toBeNull();
    },
  );
});
