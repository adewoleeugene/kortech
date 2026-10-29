import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type Area, canAccess } from "./access";
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, deleteSession, validateSession } from "./session";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Once per request, however many components ask.
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await validateSession(token);
  return session?.user ?? null;
});

export async function requireUser(nextPath?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login");
  return user;
}

// Signed in and allowed into this area, otherwise redirected.
export async function requireArea(area: Area) {
  const user = await requireUser(`/${area}`);
  if (!canAccess(user.role, area)) redirect("/forbidden");
  return user;
}

// Only callable from server actions and route handlers (cookies are read-only during render).
export async function signIn(userId: string) {
  const { token } = await createSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_MS / 1000 });
}

export async function signOut() {
  const jar = await cookies();
  await deleteSession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
}
