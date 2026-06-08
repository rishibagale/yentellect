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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full border border-slate-200/50 dark:border-slate-700/50 animate-fade-in">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 text-center">
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6 text-center text-sm">
          {message}
        </p>
        <div className="flex gap-2">
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium text-sm"
            >
              Try Again
            </button>
          )}
          {showHomeButton && (
            <button
              onClick={() => router.push("/")}
              className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:from-indigo-700 hover:to-purple-700 transition shadow-sm"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
