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
          ? "bg-[#080B11]/80 backdrop-blur-2xl border-b border-[#1E2535] shadow-lg shadow-black/5"
          : "bg-[#080B11]/50 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
        <motion.div whileHover={{ scale: 1.02 }}>
          <Link href="/" className="flex items-center gap-2.5 group" aria-label="Home">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#6C63FF] to-[#00E5FF] flex items-center justify-center shadow-active group-hover:shadow-[0_0_20px_rgba(108,99,255,0.3)] transition-shadow">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="font-space font-semibold text-sm tracking-tight hidden sm:inline">Yentellect</span>
          </Link>
        </motion.div>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all duration-200 ${
              pathname === "/"
                ? "bg-white/10 text-[#F0F4FF]"
                : "text-[#5A6480] hover:text-[#F0F4FF] hover:bg-white/5"
            }`}
          >
            Home
          </Link>
          {user && (
            <Link
              href="/profile"
              className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-all duration-200 ${
                pathname?.startsWith("/profile")
                  ? "bg-white/10 text-[#F0F4FF]"
                  : "text-[#5A6480] hover:text-[#F0F4FF] hover:bg-white/5"
              }`}
            >
              Profile
            </Link>
          )}
          {user && (
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 rounded-[10px] text-xs font-medium text-[#5A6480] hover:text-[#F0F4FF] hover:bg-white/5 transition-all duration-200"
            >
              Sign out
            </button>
          )}
          <motion.button
            onClick={() => router.push("/")}
            className="ml-2 px-3.5 py-1.5 rounded-[10px] bg-[#6C63FF] text-white text-xs font-medium hover:opacity-90 transition-all shadow-active"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            + New
          </motion.button>
        </nav>
      </div>
    </motion.header>
  );
}