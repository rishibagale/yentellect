import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user to check if they need to be created in the backend
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // For OAuth sign-ins, create backend user profile if it doesn't exist
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
          await fetch(`${apiBase}/profile/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: user.id,
              name: displayName,
            }),
          });
        } catch {
          // Non-critical - auth succeeded regardless
          console.warn("Could not create backend user for OAuth sign-in");
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login if something went wrong
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}