/**
 * Yentellect — account settings form (reformed, Stage 1).
 *
 * Extracted from app/settings/page.tsx so the /settings route AND the
 * workbench Settings activity panel render the same implementation (one
 * source, two hosts). No page heading or AppShell here — the host owns those.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/utils/supabase/provider";

import { readBetaModes, readUserField, writeBetaModes, writeUserField } from "@/lib/workbench/storage";

export default function SettingsForm({
  betaModes,
  onToggleBetaModes,
}: {
  betaModes?: boolean;
  onToggleBetaModes?: (on: boolean) => void;
} = {}) {
  const router = useRouter();
  const { user, supabase } = useSupabase();
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [userField, setUserField] = useState(() => readUserField());
  const [localBeta, setLocalBeta] = useState(() => readBetaModes());
  const betaOn = onToggleBetaModes ? Boolean(betaModes) : localBeta;
  const setBetaOn = onToggleBetaModes
    ? (fn: boolean | ((v: boolean) => boolean)) =>
        onToggleBetaModes(typeof fn === "function" ? fn(betaOn) : fn)
    : (fn: boolean | ((v: boolean) => boolean)) =>
        setLocalBeta((v) => (typeof fn === "function" ? fn(v) : fn));
  useEffect(() => {
    writeUserField(userField);
  }, [userField]);
  useEffect(() => {
    if (onToggleBetaModes) return; // shell owns the value
    writeBetaModes(localBeta);
  }, [localBeta, onToggleBetaModes]);
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
    <div className="space-y-6">
      {/* Research */}
      <div className="glass-card-strong p-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Research</h2>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">
            Your research area
          </label>
          <input
            type="text"
            value={userField}
            onChange={(e) => setUserField(e.target.value)}
            placeholder="e.g. distributed systems, protein folding…"
            maxLength={300}
            className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition text-sm"
          />
          <p className="text-[10px] text-slate-600 mt-1">
            Used by the lenses to pick cross-field analogies and jargon level. Stored on this device only.
          </p>
        </div>
      </div>

      {/* Lenses */}
      <div className="glass-card-strong p-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Lenses</h2>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span>
            <span className="block text-xs text-slate-200">Beta modes</span>
            <span className="block text-[10px] text-slate-500 mt-0.5">
              Show Convergent, Divergent, Metacognitive and DMN in the lens switcher. Experimental.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={betaOn}
            aria-label="Beta modes"
            onClick={() => setBetaOn((v) => !v)}
            className={`relative h-5 w-9 shrink-0 rounded-full border border-[var(--border)] transition-colors ${
              betaOn ? "bg-[var(--accent)]" : "bg-[var(--bg-0)]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-[var(--text)] transition-all ${
                betaOn ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Profile */}
      <div className="glass-card-strong p-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">Profile</h2>
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
              className="w-full px-3.5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent transition text-sm"
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
            <div className="text-sm text-[var(--danger)] bg-[var(--bg-1)] border border-[var(--danger)] p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !displayName.trim()}
              className="px-5 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-0)] text-xs font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
            {saved && <span className="text-xs text-[var(--accent)]">Saved!</span>}
          </div>
        </form>
      </div>

      {/* Danger zone */}
      <div className="glass-card-strong p-6 border-[var(--danger)]">
        <h2 className="text-sm font-semibold text-[var(--danger)] mb-2">Sign out</h2>
        <p className="text-xs text-slate-500 mb-4">
          You can sign out of your account here.
        </p>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg border border-[var(--danger)] text-[var(--danger)] text-xs font-medium hover:bg-[var(--bg-1)] transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
