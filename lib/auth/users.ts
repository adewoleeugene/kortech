import { db } from "@/lib/db";

// Phone sign-in creates the account on first use. New accounts are farmers;
// business roles are assigned during organisation registration (Milestone 3).
export async function findOrCreateUserByPhone(phone: string) {
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) return existing.deletedAt ? null : existing;
  return db.user.create({ data: { phone, role: "FARMER" } });
}

