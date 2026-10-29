import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env and set it.");
  }

  return {
    plugins: [tsconfigPaths()],
    test: {
      environment: "node",
      include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
      exclude: ["tests/e2e/**"],
      globalSetup: ["tests/global-setup.ts"],
      setupFiles: ["tests/setup.ts"],
      // Integration tests share one database, so run files one after another.
      fileParallelism: false,
      env: {
        DATABASE_URL: testDatabaseUrl,
        TEST_DATABASE_URL: testDatabaseUrl,
        OTP_SECRET: "test-otp-secret",
        SMS_PROVIDER: "mock",
        SMS_OUTBOX_FILE: "",
      },
    },
  };
});
