/**
 * History route — thin host over SessionHistoryList (shared with the future
 * workbench Explorer tree; see components/SessionHistoryList.tsx).
 */
"use client";

import AppShell from "@/components/AppShell";
import SessionHistoryList from "@/components/SessionHistoryList";

export default function HistoryPage() {
  return (
    <AppShell>
      <SessionHistoryList />
    </AppShell>
  );
}
