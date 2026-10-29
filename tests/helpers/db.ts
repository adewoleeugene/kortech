import { db } from "@/lib/db";

// Clears account data in the test database (reference data stays).
export async function clearAccountData() {
  await db.$transaction([
    db.supplierListing.deleteMany(),
    db.auditLog.deleteMany(),
    db.orgDocument.deleteMany(),
    db.orgMember.deleteMany(),
    db.organisation.deleteMany(),
    db.session.deleteMany(),
    db.farmerProfile.deleteMany(),
    db.user.deleteMany(),
    db.otpCode.deleteMany(),
    db.rateLimitHit.deleteMany(),
  ]);
}

// A fresh, valid Sierra Leone number per call so tests don't collide.
let counter = 0;
export function testPhone(): string {
  counter += 1;
  const suffix = String((Date.now() % 1_000_000) + counter).padStart(6, "0").slice(-6);
  return `+23277${suffix}`;
}
