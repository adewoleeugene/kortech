import { PrismaClient } from "@prisma/client";
import { seedReferenceData } from "./seed-reference";

const db = new PrismaClient();

seedReferenceData(db)
  .then((counts) => {
    console.log("Seed complete:", counts);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
