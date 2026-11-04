import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/auth/reset-password",
  "/bridge.bat",
  "/bridge-server.mjs",
  "/mcp-utils.mjs",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute =
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    ) ||
    pathname.endsWith(".bat") ||
    pathname.endsWith(".mjs");

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // updateSession calls getUser() which validates the token with Supabase Auth,
  // refreshes expired tokens in cookies via setAll, and returns the response
  // with updated Set-Cookie headers intact.
  const { supabaseResponse, user } = await updateSession(request);

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
