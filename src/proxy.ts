import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// better-auth stores the session in `<prefix>.session_token`.
// In production over HTTPS it uses the `__Secure-` prefix.
// See node_modules/better-auth/dist/cookies/index.mjs (getSessionCookie).
const SESSION_COOKIES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

// Routes that require a session cookie (optimistic check only —
// proxy just checks existence, real verification happens in the DAL /
// route handlers). Extend as new private routes are added.
const PROTECTED_ROUTES = ["/dashboard"];

// Routes only for logged-out users. Logged-in users are sent home.
const AUTH_ROUTES = ["/login"];

function hasSessionCookie(request: NextRequest): boolean {
  return SESSION_COOKIES.some(
    (name) => (request.cookies.get(name)?.value?.length ?? 0) > 0,
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasSessionCookie(request);
console.log(hasSession)
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Not logged in → protected route kicks back to /login.
  if (isProtected && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Logged in → visiting /login (or /signup) bounces home.
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }
 
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on app routes, skip static assets / image optimizer / api auth.
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
