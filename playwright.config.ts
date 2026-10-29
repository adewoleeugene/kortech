import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

if (existsSync(".env")) process.loadEnvFile(".env");

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is not set");

const PORT = 3100;
const SMS_OUTBOX_FILE = ".data/e2e-sms-outbox.jsonl";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  // Low-end Android phone viewport (PRD 7).
  projects: [{ name: "mobile-chrome", use: { ...devices["Pixel 5"] } }],
  webServer: {
    // Production build, so page weight and 3G timings match what farmers get.
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
      NEXT_DIST_DIR: ".next-e2e",
      OTP_SECRET: "e2e-otp-secret",
      SMS_PROVIDER: "mock",
      // The mock SMS provider is refused in production unless explicitly allowed (test server only).
      ALLOW_MOCK_SMS: "true",
      SMS_OUTBOX_FILE,
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: ".data/e2e-private",
      STORAGE_SIGNING_SECRET: "e2e-storage-secret",
      MEDIA_LOCAL_DIR: ".data/e2e-media",
    },
  },
});
