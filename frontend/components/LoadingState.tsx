"use client";

import React from "react";

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
    ? "min-h-screen flex items-center justify-center"
    : "flex items-center justify-center py-12";

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div
          className={`inline-block rounded-full border-indigo-600 ${sizeClasses[size]} animate-spin mb-3`}
        />
        {message && (
          <p className="text-slate-600 dark:text-slate-300 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}
