import { existsSync, readFileSync } from "node:fs";
import { type Page, expect } from "@playwright/test";
import { PrismaClient, type Role } from "@prisma/client";

const OUTBOX = ".data/e2e-sms-outbox.jsonl";

let counter = 0;
// A fresh local-format number per test, e.g. "078 4xx xxx".
export function newLocalPhone(): { local: string; e164: string } {
  counter += 1;
  const digits = String((Date.now() % 100_000) * 10 + counter).padStart(6, "0").slice(-6);
  return { local: `078${digits}`, e164: `+23278${digits}` };
}

// Reads the code the mock SMS provider wrote for this number.
export async function readOtp(e164: string): Promise<string> {
  let code: string | undefined;
  await expect
    .poll(() => {
      if (!existsSync(OUTBOX)) return undefined;
      const lines = readFileSync(OUTBOX, "utf8").trim().split("\n").filter(Boolean);
      const last = lines.map((l) => JSON.parse(l) as { to: string; message: string }).filter((m) => m.to === e164).at(-1);
      code = last?.message.match(/\b(\d{6})\b/)?.[1];
      return code;
    })
    .toBeTruthy();
  return code!;
}

export async function signInWithPhone(page: Page, phone: { local: string; e164: string }) {
  await page.goto("/login");
  await page.getByLabel("Phone number").fill(phone.local);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page).toHaveURL(/\/login\/verify/);
  await page.getByLabel("6-digit code").fill(await readOtp(phone.e164));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

// Gives a signed-in account an approved supplier organisation (skips the verification flow).
export async function makeApprovedSupplier(e164: string, legalName: string) {
  const db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  try {
    const user = await db.user.update({ where: { phone: e164 }, data: { role: "SUPPLIER" } });
    const district = await db.district.findUniqueOrThrow({ where: { slug: "kenema" } });
    await db.organisation.create({
      data: {
        type: "SUPPLIER",
        legalName,
        regNumber: "E2E-1",
        address: "Hangha Road, Kenema",
        districtId: district.id,
        contactName: "E2E Supplier",
        phone: e164,
        status: "APPROVED",
        verifiedAt: new Date(),
        members: { create: { userId: user.id } },
      },
    });
  } finally {
    await db.$disconnect();
  }
}

export async function setRole(e164: string, role: Role, name?: string) {
  const db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  try {
    await db.user.update({ where: { phone: e164 }, data: { role, ...(name ? { name } : {}) } });
  } finally {
    await db.$disconnect();
  }
}

// Records questions as already asked today, to test the daily limit without 20 slow round trips.
export async function addQuestionsToday(e164: string, count: number) {
  const db = new PrismaClient({ datasourceUrl: process.env.TEST_DATABASE_URL });
  try {
    const user = await db.user.findUniqueOrThrow({ where: { phone: e164 } });
    const conversation = await db.aiConversation.create({ data: { userId: user.id } });
    await db.aiMessage.createMany({
      data: Array.from({ length: count }, (_, i) => ({ conversationId: conversation.id, role: "USER" as const, content: `Earlier question ${i}` })),
    });
  } finally {
    await db.$disconnect();
  }
}
