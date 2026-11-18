import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "fp_session";

const PROTECTED_PREFIXES = [
  "/onboarding",
  "/dashboard",
  "/transactions",
  "/budget",
  "/goals",
  "/investments",
  "/debts",
  "/bills",
  "/reports",
  "/settings",
];

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // NOTE: deliberately no "/login → /dashboard" redirect here. The cookie can
  // outlive the DB session (30-min idle expiry vs 7-day cookie maxAge), and
  // bouncing on cookie-presence alone creates an infinite proxy ↔ server
  // redirect loop for expired sessions. The login page itself redirects
  // users with a *valid* session via getSessionUser().

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/onboarding/:path*",
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budget/:path*",
    "/goals/:path*",
    "/investments/:path*",
    "/debts/:path*",
    "/bills/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};
