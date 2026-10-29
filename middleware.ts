import { type NextRequest, NextResponse } from "next/server";

// Cheap first gate: no session cookie on a protected area -> sign in.
// The real check (valid session + role) happens on the server in each area's
// layout and in every action, because middleware can't see the database.
const PROTECTED = ["/farmer", "/business", "/admin", "/onboarding", "/register-business"];
const SESSION_COOKIE = "sf_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Sliding sign-in: keep the cookie alive while the user keeps coming back.
  if (token) {
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/|api/|media/|icons/|icon.png|apple-icon.png|manifest.webmanifest).*)"],
};
