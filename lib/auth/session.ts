import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "sf_session";
// Signed-in for 30 days, extended when the user comes back.
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
// Only write the extension to the database once a day per session.
const SESSION_REFRESH_AFTER_MS = 24 * 60 * 60_000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, now: Date = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), expiresAt, lastUsedAt: now, createdAt: now } });
  return { token, expiresAt };
}

// Returns the signed-in user for a session token, or null. Extends the session (sliding expiry).
export async function validateSession(token: string | undefined, now: Date = new Date()) {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= now || session.user.deletedAt) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  let expiresAt = session.expiresAt;
  if (now.getTime() - session.lastUsedAt.getTime() > SESSION_REFRESH_AFTER_MS) {
    expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await db.session.update({ where: { id: session.id }, data: { lastUsedAt: now, expiresAt } });
  }
  return { user: session.user, sessionId: session.id, expiresAt };
}

export async function deleteSession(token: string | undefined) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
