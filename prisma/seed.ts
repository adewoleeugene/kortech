import { PrismaClient } from "@prisma/client";
import { seedReferenceData } from "./seed-reference";
import { seedSampleSuppliers } from "./seed-samples";

const db = new PrismaClient();

async function main() {
  console.log("Reference data:", await seedReferenceData(db));
  // Sample businesses are for local development and demos only.
  if (process.env.NODE_ENV !== "production" && process.env.SEED_SAMPLES !== "false") {
    console.log("Sample suppliers:", await seedSampleSuppliers(db));
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
