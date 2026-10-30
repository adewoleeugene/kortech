import "server-only";
import { randomInt } from "node:crypto";
import type { OrgStatus, OrgType, Role, User } from "@prisma/client";
import { db } from "@/lib/db";

// Demo mode (DEMO_MODE="true"): one-tap sign-in as sample accounts for each flow,
// and the one-time code shown on screen. Anyone with the link can use it, so it
// must be off once real users and documents arrive.
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true";
}

type DemoOrg = { type: OrgType; status: OrgStatus; legalName: string };

type DemoAccount = {
  phone: string;
  name: string;
  role: Role;
  farmer?: { district: string; crops: string[] };
  org?: DemoOrg;
};

// Fixed numbers in the +232 99 range so they are easy to spot in admin screens.
export const DEMO_ACCOUNTS = {
  farmer: {
    phone: "+23299000001",
    name: "Aminata Kamara (demo)",
    role: "FARMER",
    farmer: { district: "bo", crops: ["rice", "cassava", "groundnut"] },
  },
  supplier: {
    phone: "+23299000002",
    name: "Mohamed Sesay (demo)",
    role: "SUPPLIER",
    org: { type: "SUPPLIER", status: "APPROVED", legalName: "Demo Agro Inputs Ltd" },
  },
  pendingSupplier: {
    phone: "+23299000003",
    name: "Fatmata Conteh (demo)",
    role: "SUPPLIER",
    org: { type: "SUPPLIER", status: "PENDING", legalName: "Demo Seeds and Tools Enterprise" },
  },
  buyer: {
    phone: "+23299000004",
    name: "Ibrahim Bangura (demo)",
    role: "BUYER",
    org: { type: "BUYER", status: "APPROVED", legalName: "Demo Produce Buyers Ltd" },
  },
  lender: {
    phone: "+23299000005",
    name: "Isatu Koroma (demo)",
    role: "LENDER",
    org: { type: "LENDER", status: "APPROVED", legalName: "Demo Rural Microfinance" },
  },
  admin: { phone: "+23299000006", name: "Kortech Admin (demo)", role: "ADMIN" },
  agronomist: { phone: "+23299000007", name: "Dr. Abu Turay (demo)", role: "AGRONOMIST" },
} satisfies Record<string, DemoAccount>;

export type DemoAccountKey = keyof typeof DEMO_ACCOUNTS;
// Sign-up flows start from a brand-new account each time.
export type DemoNewUserFlow = "newFarmer" | "newBusiness";

export function isDemoAccountKey(key: string): key is DemoAccountKey {
  return Object.hasOwn(DEMO_ACCOUNTS, key);
}

// Creates (or repairs) the demo account so it is ready to use, then returns the user.
export async function ensureDemoAccount(key: DemoAccountKey): Promise<User> {
  const account: DemoAccount = DEMO_ACCOUNTS[key];
  const user = await db.user.upsert({
    where: { phone: account.phone },
    update: { name: account.name, role: account.role, deletedAt: null },
    create: { phone: account.phone, name: account.name, role: account.role },
  });

  if (account.farmer) {
    const hasProfile = await db.farmerProfile.count({ where: { userId: user.id } });
    if (!hasProfile) {
      const district = await db.district.findUniqueOrThrow({ where: { slug: account.farmer.district } });
      await db.farmerProfile.create({
        data: {
          userId: user.id,
          districtId: district.id,
          farmSize: 3,
          crops: { connect: account.farmer.crops.map((slug) => ({ slug })) },
        },
      });
    }
    // The ready-to-use farmer skips photo evidence; "New farmer sign-up" shows that step.
    await db.farmerProfile.update({ where: { userId: user.id }, data: { verificationStatus: "APPROVED", verifiedAt: new Date() } });
  }

  if (account.org) {
    const membership = await db.orgMember.findUnique({ where: { userId: user.id } });
    if (!membership) {
      const district = await db.district.findUniqueOrThrow({ where: { slug: "western-area-urban" } });
      const now = new Date();
      const approved = account.org.status === "APPROVED";
      await db.organisation.create({
        data: {
          type: account.org.type,
          legalName: account.org.legalName,
          regNumber: `DEMO-${account.phone.slice(-4)}`,
          address: "12 Siaka Stevens Street, Freetown",
          districtId: district.id,
          contactName: account.name,
          phone: account.phone,
          status: account.org.status,
          submittedAt: now,
          verifiedAt: approved ? now : null,
          members: { create: { userId: user.id, role: "OWNER" } },
        },
      });
    }
  }

  return user;
}

// A fresh farmer account with an unused demo number, for walking through sign-up.
export async function createDemoNewUser(): Promise<User> {
  for (;;) {
    const phone = `+2329910${randomInt(0, 10 ** 4).toString().padStart(4, "0")}`;
    const taken = await db.user.count({ where: { phone } });
    if (!taken) return db.user.create({ data: { phone, role: "FARMER" } });
  }
}
