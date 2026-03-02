import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "terminal_session";

const PUBLIC_PATH_PREFIXES = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];

function isPublicPath(pathname: string) {
  if (pathname === "/login") {
    return true;
  }

  if (pathname.startsWith("/api/auth/")) {
    return true;
  }

  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const authToken = process.env.TERMINAL_AUTH_TOKEN;
  if (!authToken) {
    return new NextResponse("Missing TERMINAL_AUTH_TOKEN server configuration", { status: 500 });
  }

  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (sessionCookie === authToken) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
