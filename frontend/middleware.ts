import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

const publicRoutes = [
  "/",
  "/session",
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/auth/reset-password",
  "/bridge.bat",
  "/bridge-server.mjs",
  "/mcp-utils.mjs",
  "/manifest.json",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute =
    publicRoutes.some(
      (route) => pathname === route || (route !== "/" && pathname.startsWith(route + "/"))
    ) ||
    pathname.endsWith(".bat") ||
    pathname.endsWith(".mjs");

  // updateSession validates token with Supabase Auth if present,
  // refreshing expired cookies.
  const { supabaseResponse, user } = await updateSession(request);

  // If public route or guest-accessible workbench/session, allow through
  if (isPublicRoute || pathname === "/" || pathname.startsWith("/session")) {
    return supabaseResponse;
  }

  if (!user) {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon\\.ico|bridge\\.bat|bridge-server\\.mjs|mcp-utils\\.mjs|api/).*)",
  ],
};
