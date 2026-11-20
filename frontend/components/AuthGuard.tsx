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
      // Guest-accessible pages: Workbench (/) and Socratic dialogue (/session)
      // allow immediate scientific research without requiring an account.
      // Auth pages (/auth/*) are also exempt.
      const onExemptPage =
        pathname === "/" ||
        pathname.startsWith("/session") ||
        pathname.startsWith("/auth/login") ||
        pathname.startsWith("/auth/signup") ||
        pathname.startsWith("/auth/callback") ||
        pathname.startsWith("/auth/reset-password");
      if (onExemptPage) return;
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