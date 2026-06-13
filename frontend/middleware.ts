import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "./utils/supabase/middleware";

const publicRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/auth/reset-password",
  "/_next/static",
  "/_next/image",
  "/favicon.ico",
];

const publicRoutePatterns = [
  /\.(?:svg|png|jpg|jpeg|gif|webp)$/,
];

export async function middleware(request: NextRequest) {
  const { supabase, supabaseResponse } = createClient(request);
  const { pathname } = request.nextUrl;

  // Allow public assets and auth pages through
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isPublicPattern = publicRoutePatterns.some((pattern) => pattern.test(pathname));
  const isRoot = pathname === "/";

  if (isPublicRoute || isPublicPattern || isRoot) {
    // Still refresh the session even on public pages
    const { data } = await supabase.auth.getUser();
    // The root page is public but shows different UI based on auth state
    return supabaseResponse;
  }

  // For protected routes, check authentication
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // No valid session — redirect to login
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User is authenticated, proceed
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};