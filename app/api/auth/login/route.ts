import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "terminal_session";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const nextPath = String(formData.get("next") || "/");

    const adminUsername = getRequiredEnv("TERMINAL_ADMIN_USERNAME");
    const adminPassword = getRequiredEnv("TERMINAL_ADMIN_PASSWORD");
    const authToken = getRequiredEnv("TERMINAL_AUTH_TOKEN");

    if (username !== adminUsername || password !== adminPassword) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", "invalid_credentials");
      return NextResponse.redirect(loginUrl);
    }

    const redirectUrl = new URL(nextPath.startsWith("/") ? nextPath : "/", request.url);
    const response = NextResponse.redirect(redirectUrl);

    response.cookies.set(AUTH_COOKIE_NAME, authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication service misconfigured", details: String(error) },
      { status: 500 }
    );
  }
}
