"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSupabase } from "@/utils/supabase/provider";
import { getModeColor, getModeName, type ThinkingMode } from "@/lib/api";

const NAV_ITEMS = [
  { href: "/", label: "Workbench", icon: DashboardIcon },
  { href: "/session", label: "New Session", icon: SessionIcon },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function SessionIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.245-.406-7.499-1.132z" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003 1.008c-.253.255-.427.577-.476.914l-.377 2.042c-.067.361-.338.65-.7.672-.36.021-.74-.21-.9-.684l-.235-.99a1.125 1.125 0 01.473-1.238l1.86-1.4c.105-.08.21-.16.312-.244zM15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, supabase } = useSupabase();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--text)]">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg-0)] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          {/* Logo + brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[var(--radius)] bg-[var(--bg-2)] flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="font-mono font-semibold text-sm tracking-tight hidden sm:inline">Research Workbench</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || (item.href === "/session" && pathname.startsWith("/session"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition ${
                      isActive
                        ? "text-[var(--text)] bg-white/10"
                        : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5"
                    }`}
                  >
                    <item.icon active={isActive} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: user + actions */}
          <div className="flex items-center gap-3">
            {/* New session CTA */}
            <motion.button
              onClick={() => router.replace("/session")}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--bg-0)] text-xs font-medium hover:opacity-90 transition "
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New session
            </motion.button>

            {/* User menu */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[var(--bg-2)] flex items-center justify-center">
                  <span className="text-xs font-bold text-[var(--text)]">
                    {(user.user_metadata?.display_name || user.email || "U")[0].toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-[var(--text-dim)] hover:text-[var(--text)] transition"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex items-center justify-around border-t border-[var(--border)] px-2 py-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href === "/session" && pathname.startsWith("/session"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-[var(--radius)] text-[10px] font-medium transition min-w-[64px] ${
                  isActive ? "text-[var(--text)] bg-white/10" : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5"
                }`}
              >
                <item.icon active={isActive} />
                {item.label}
              </Link>
            );
          })}
      </nav>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}