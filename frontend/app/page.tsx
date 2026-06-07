"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startSession } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [opening, setOpening] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opening.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Use name as user_id (or generate a new UUID-like id)
      const userId = name.trim() || `user-${Date.now()}`;
      const session = await startSession(userId, opening.trim());

      // Persist user id for the session
      sessionStorage.setItem("yentellect_user_id", userId);
      sessionStorage.setItem("yentellect_user_name", name.trim());

      // Navigate to session page
      router.push(`/session?session_id=${session.session_id}&user_id=${encodeURIComponent(userId)}`);
    } catch (err: any) {
      setError(err?.message || "Failed to start session");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Yentellect
          </h1>
          <p className="mt-4 text-xl text-slate-600 dark:text-slate-300">
            Most AI makes you more informed. Yentellect makes you think better.
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            A cognitive development system that detects how you think and trains
            your weakest modes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6 animate-slide-up"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
            >
              What should we call you? <span className="text-slate-400">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
            />
          </div>

          <div>
            <label
              htmlFor="opening"
              className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2"
            >
              What's a problem you've been thinking about lately?
            </label>
            <textarea
              id="opening"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              placeholder="E.g., how to think clearly under pressure..."
              rows={4}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !opening.trim()}
            className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg hover:shadow-xl"
          >
            {loading ? "Starting session..." : "Begin Training"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400">
          <p>No signup. No friction. Just thinking.</p>
        </div>
      </div>
    </main>
  );
}