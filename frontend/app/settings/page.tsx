/**
 * Settings route — thin host over SettingsForm (shared with the workbench
 * Settings activity panel; see components/SettingsForm.tsx).
 */
"use client";

import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)]">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your account</p>
        </motion.div>

        <SettingsForm />
      </div>
    </AppShell>
  );
}
