"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface HeaderProps {
  userId?: string;
}

export default function Header({ userId }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-[#0a0a0b]/70 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group" aria-label="Home">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="font-semibold text-sm hidden sm:inline">Yentellect</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
              pathname === "/"
                ? "bg-white/10 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Home
          </Link>
          {userId && (
            <Link
              href={`/profile?user_id=${encodeURIComponent(userId)}`}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition ${
                pathname?.startsWith("/profile")
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Profile
            </Link>
          )}
          <button
            onClick={() => router.push("/")}
            className="ml-1 px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition shadow-sm"
          >
            + New
          </button>
        </nav>
      </div>
    </header>
  );
}
