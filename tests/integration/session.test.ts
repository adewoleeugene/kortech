import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { SESSION_TTL_MS, createSession, deleteSession, validateSession } from "@/lib/auth/session";
import { findOrCreateUserByPhone } from "@/lib/auth/users";
import { db } from "@/lib/db";
import { clearAccountData, testPhone } from "../helpers/db";

const T0 = new Date("2026-11-01T08:00:00Z");
const DAY = 24 * 60 * 60_000;

beforeEach(clearAccountData);
afterAll(() => db.$disconnect());

describe("findOrCreateUserByPhone", () => {
  it("creates a farmer on first sign-in and returns the same user after", async () => {
    const phone = testPhone();
    const first = await findOrCreateUserByPhone(phone);
    const again = await findOrCreateUserByPhone(phone);
    expect(first).toMatchObject({ phone, role: "FARMER" });
    expect(again?.id).toBe(first?.id);
  });

  it("refuses a deleted account", async () => {
    const phone = testPhone();
    await db.user.create({ data: { phone, deletedAt: T0 } });
    expect(await findOrCreateUserByPhone(phone)).toBeNull();
  });
});

describe("sessions", () => {
  it("stores only a hash of the token", async () => {
    const user = (await findOrCreateUserByPhone(testPhone()))!;
    const { token } = await createSession(user.id, T0);
    const row = await db.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.tokenHash).not.toBe(token);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns the user for a valid token, null for unknown or missing tokens", async () => {
    const user = (await findOrCreateUserByPhone(testPhone()))!;
    const { token } = await createSession(user.id, T0);
    expect((await validateSession(token, T0))?.user.id).toBe(user.id);
    expect(await validateSession("not-a-token", T0)).toBeNull();
    expect(await validateSession(undefined, T0)).toBeNull();
  });

  it("expires after 30 days without use", async () => {
    const user = (await findOrCreateUserByPhone(testPhone()))!;
    const { token } = await createSession(user.id, T0);
    expect(await validateSession(token, new Date(T0.getTime() + SESSION_TTL_MS))).toBeNull();
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("extends the expiry when the user comes back", async () => {
    const user = (await findOrCreateUserByPhone(testPhone()))!;
    const { token } = await createSession(user.id, T0);
    const day20 = new Date(T0.getTime() + 20 * DAY);
    const refreshed = await validateSession(token, day20);
    expect(refreshed?.expiresAt).toEqual(new Date(day20.getTime() + SESSION_TTL_MS));
    // Day 40 is past the original expiry but inside the extended one.
    expect(await validateSession(token, new Date(T0.getTime() + 40 * DAY))).not.toBeNull();
  });

  it("ends the session for a deleted user", async () => {
    const user = (await findOrCreateUserByPhone(testPhone()))!;
    const { token } = await createSession(user.id, T0);
    await db.user.update({ where: { id: user.id }, data: { deletedAt: T0 } });
    expect(await validateSession(token, T0)).toBeNull();
  });

  it("sign-out deletes the session", async () => {
    const user = (await findOrCreateUserByPhone(testPhone()))!;
    const { token } = await createSession(user.id, T0);
    await deleteSession(token);
    expect(await validateSession(token, T0)).toBeNull();
  });
});
