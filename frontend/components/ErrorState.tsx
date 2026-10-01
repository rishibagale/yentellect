"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface ErrorStateProps {
  title?: string;
  message: string;
  showRetry?: boolean;
  onRetry?: () => void;
  showHomeButton?: boolean;
}

export default function ErrorState({
  title = "Something went wrong",
  message,
  showRetry = true,
  onRetry,
  showHomeButton = true,
}: ErrorStateProps) {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-0)]">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[var(--radius)] p-8 max-w-md w-full animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-[var(--bg-1)] flex items-center justify-center mb-4 mx-auto">
          <svg className="w-6 h-6 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2 text-center">{title}</h2>
        <p className="text-slate-400 mb-6 text-center text-sm">{message}</p>
        <div className="flex gap-2">
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-2.5 px-4 rounded-lg border border-white/10 text-slate-300 hover:bg-white/5 transition font-medium text-sm"
            >
              Try again
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={() => router.push("/")}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[var(--accent)] text-[var(--bg-0)] font-medium text-sm hover:opacity-90 transition"
            >
              Start over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
