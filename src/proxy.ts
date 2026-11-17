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

  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

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
    "/login",
  ],
};
