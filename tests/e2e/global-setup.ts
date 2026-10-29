import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { seedReferenceData } from "../../prisma/seed-reference";
import { seedSampleSuppliers } from "../../prisma/seed-samples";

// Prepare the test database: latest schema, reference data, no leftover accounts or rate-limit hits.
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !/test/i.test(url)) throw new Error("e2e tests need a TEST_DATABASE_URL that mentions 'test'");

  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });

  const db = new PrismaClient({ datasourceUrl: url });
  try {
    await seedReferenceData(db);
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
    // A realistic directory for the browsing and 3G tests.
    await seedSampleSuppliers(db);
  } finally {
    await db.$disconnect();
  }
  rmSync(".data/e2e-sms-outbox.jsonl", { force: true });
}
