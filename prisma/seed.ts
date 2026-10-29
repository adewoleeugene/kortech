import { PrismaClient } from "@prisma/client";
import { seedReferenceData } from "./seed-reference";
import { seedDraftGuides } from "./seed-guides";
import { seedSampleSuppliers } from "./seed-samples";

const db = new PrismaClient();

async function main() {
  console.log("Reference data:", await seedReferenceData(db));
  // Sample businesses, and showing draft guides to farmers, are for local development and demos only.
  const samples = process.env.NODE_ENV !== "production" && process.env.SEED_SAMPLES !== "false";
  // Draft guides are always added; in production they stay unpublished until an agronomist reviews them.
  console.log("Draft guides:", await seedDraftGuides(db, { publishAsSample: samples }));
  if (samples) console.log("Sample suppliers:", await seedSampleSuppliers(db));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
