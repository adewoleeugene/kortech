import { execSync } from "node:child_process";
import { loadEnv } from "vite";

// Bring the test database up to the latest migration before every run.
// "migrate deploy" only applies pending migrations and never drops data;
// tests that need a clean slate clear their own tables.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? loadEnv("test", process.cwd(), "").TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  if (!/test/i.test(url)) {
    throw new Error(`Refusing to run tests against a database whose URL does not mention "test": ${url}`);
  }
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url },
  });
}
