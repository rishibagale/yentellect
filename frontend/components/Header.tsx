"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSupabase } from "@/utils/supabase/provider";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useSupabase();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    const { signOut } = await import("@/lib/auth-types");
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-[var(--bg-0)] backdrop-blur-2xl border-b border-[var(--border)] shadow-black/5"
          : "bg-[var(--bg-0)] backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Home">
            <div className="w-8 h-8 rounded-[var(--radius)] bg-[var(--bg-2)] flex items-center justify-center  group-hover:shadow-[0_0_20px_rgba(108,99,255,0.3)] transition-shadow">
              <svg className="w-4 h-4 text-[var(--text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-mono font-semibold text-sm tracking-tight hidden sm:inline">Yentellect</span>
          </Link>
        </motion.div>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-all duration-200 ${
              pathname === "/"
                ? "bg-white/10 text-[var(--text)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5"
            }`}
          >
            Home
          </Link>
          {user && (
            <Link
              href="/profile"
              className={`px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium transition-all duration-200 ${
                pathname?.startsWith("/profile")
                  ? "bg-white/10 text-[var(--text)]"
                  : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5"
              }`}
            >
              Profile
            </Link>
          )}
          {user && (
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5 transition-all duration-200"
            >
              Sign out
            </button>
          )}
          <motion.button
            onClick={() => router.push("/session")}
            className="ml-2 px-3.5 py-1.5 rounded-[var(--radius)] bg-[var(--accent)] text-[var(--bg-0)] text-xs font-medium hover:opacity-90 transition-all "
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            New session
          </motion.button>
        </nav>
      </div>
    </motion.header>
  );
}