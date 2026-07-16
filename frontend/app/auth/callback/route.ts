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
      const [{ data: { user } }, { data: { session } }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);

      if (user && session?.access_token) {
        const displayName =
          user.user_metadata?.display_name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://yentellect.onrender.com";
        fetch(`${apiBase}/profile/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            user_id: user.id,
            name: displayName,
          }),
        }).catch(() => {});
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login if something went wrong
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}