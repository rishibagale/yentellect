"use client";

import React from "react";
import { motion } from "framer-motion";

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
}

export default function LoadingState({
  message = "Loading...",
  fullScreen = true,
  size = "md",
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-b-2",
    lg: "h-12 w-12 border-b-4",
  };
  const containerClasses = fullScreen
    ? "min-h-screen flex items-center justify-center bg-surface"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="text-center"
      >
        {size === "lg" ? (
          <div className="relative w-16 h-16 mx-auto mb-4">
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-1 rounded-full bg-surface flex items-center justify-center">
              <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
        ) : (
          <div
            className={`inline-block rounded-full border-indigo-500 ${sizeClasses[size]} animate-spin mb-3`}
          />
        )}
        {message && (
          <motion.p
            className="text-slate-500 text-sm"
            animate={size === "lg" ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={size === "lg" ? { duration: 2, repeat: Infinity } : {}}
          >
            {message}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}