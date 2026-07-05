import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\r\n]/.test(value)) {
    return "/";
  }
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user to check if they need to be created in the backend
      const { data: { user } } = await supabase.auth.getUser();
      const { data: { session } } = await supabase.auth.getSession();

      if (user && session?.access_token) {
        // For OAuth sign-ins, create backend user profile if it doesn't exist
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://yentellect.onrender.com";
          await fetch(`${apiBase}/profile/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              name: displayName,
            }),
          });
        } catch {
          // Non-critical - auth succeeded regardless
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login if something went wrong
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}