"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/utils/supabase/provider";
import AppShell from "@/components/AppShell";

export default function SettingsPage() {
  const router = useRouter();
  const { user, supabase } = useSupabase();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !displayName.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { signOut } = await import("@/lib/auth-types");
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your account</p>
        </motion.div>

        <div className="space-y-6">
          {/* Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card-strong p-6"
          >
            <h2 className="text-sm font-semibold text-white mb-4">Profile</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
                  Display name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white/[0.02] border border-white/5 text-slate-500 text-sm cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-600 mt-1">Email cannot be changed</p>
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || !displayName.trim()}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/20"
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
                {saved && (
                  <span className="text-xs text-emerald-400">Saved!</span>
                )}
              </div>
            </form>
          </motion.div>

          {/* Danger zone */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card-strong p-6 border-red-500/20"
          >
            <h2 className="text-sm font-semibold text-red-400 mb-2">Sign out</h2>
            <p className="text-xs text-slate-500 mb-4">
              You can sign out of your account here.
            </p>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/10 transition"
            >
              Sign out
            </button>
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}