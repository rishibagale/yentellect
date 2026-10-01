/**
 * Yentellect workbench root (Stage 1). Client shell under the
 * Supabase + AuthGuard layout. `dynamic(ssr:false)` avoids any
 * server/client mismatch in persisted layout state.
 */
"use client";

import dynamic from "next/dynamic";

const Shell = dynamic(() => import("@/components/workbench/Shell"), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Loading workbench"
      className="h-screen w-screen flex items-center justify-center bg-[var(--bg-0)]"
    >
      <span className="text-xs text-[var(--text-dim)]">Loading workbench…</span>
    </div>
  ),
});

export default function WorkbenchPage() {
  return <Shell />;
}
