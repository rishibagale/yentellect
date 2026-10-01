"use client";

import { useSupabase } from "@/utils/supabase/provider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useSupabase();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      // Auth pages are exempt: they are where a signed-out user is *supposed*
      // to be (redirecting a login page to itself would corrupt the `redirect`
      // param and strand the user after login). "/" is deliberately NOT exempt
      // — it is the auth-only workbench, so middleware and this backstop both
      // send signed-out visitors to login.
      const onAuthPage =
        pathname.startsWith("/auth/login") ||
        pathname.startsWith("/auth/signup") ||
        pathname.startsWith("/auth/callback") ||
        pathname.startsWith("/auth/reset-password");
      if (onAuthPage) return;
      const redirectUrl = `/auth/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirectUrl);
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-0)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}