"use client";

import { useState, useEffect } from "react";
import {
  readEngineConfig,
  writeEngineConfig,
  probeLocalEngine,
  type EngineConfig,
  type LocalHealthResult,
} from "@/lib/workbench/engine-config";

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelSettingsModal({
  isOpen,
  onClose,
}: ModelSettingsModalProps) {
  const [config, setConfig] = useState<EngineConfig>(readEngineConfig);
  const [health, setHealth] = useState<LocalHealthResult>({ online: false, models: [] });
  const [probing, setProbing] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Check health whenever modal opens or localUrl changes
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function check() {
      setProbing(true);
      const res = await probeLocalEngine(config.localUrl);
      if (!cancelled) {
        setHealth(res);
        setProbing(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [isOpen, config.localUrl]);

  if (!isOpen) return null;

  function handleSelectTarget(target: "cloud" | "local") {
    const updated = writeEngineConfig({ target });
    setConfig(updated);
  }

  function handleUpdateLocalConfig(updates: Partial<EngineConfig>) {
    const updated = writeEngineConfig(updates);
    setConfig(updated);
  }

  function copyToClipboard(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  }

  const OPENCODE_CMD = `curl -sL https://yentellect.vercel.app/bridge.bat -o bridge.bat && bridge.bat`;
  const OLLAMA_CMD = `ollama run llama3.3`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-engine-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]/70 bg-[var(--bg-1)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base text-[var(--accent)]">⚙</span>
            <h2
              id="modal-engine-title"
              className="text-sm font-semibold text-[var(--text)] tracking-tight"
            >
              AI Engine & Models
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Option 1: Cloud AI */}
          <div
            onClick={() => handleSelectTarget("cloud")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              config.target === "cloud"
                ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-2xs"
                : "border-[var(--border)]/70 bg-[var(--bg-0)]/60 hover:border-[var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="target-cloud"
                  name="engine-target"
                  checked={config.target === "cloud"}
                  onChange={() => handleSelectTarget("cloud")}
                  className="accent-[var(--accent)]"
                />
                <label
                  htmlFor="target-cloud"
                  className="font-semibold text-sm text-[var(--text)] cursor-pointer"
                >
                  🌐 Cloud AI (Hosted)
                </label>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent)]/15 text-[var(--accent)]">
                Default • Zero Setup
              </span>
            </div>
            <p className="text-[var(--text-dim)] leading-relaxed pl-5">
              Powered by Groq Llama 3.3 70B & Gemini 2.0 Flash in the cloud. Runs immediately in your browser with zero configuration or local compute required.
            </p>
          </div>

          {/* Option 2: Local Machine */}
          <div
            onClick={() => handleSelectTarget("local")}
            className={`cursor-pointer rounded-xl border p-4 transition-all ${
              config.target === "local"
                ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-2xs"
                : "border-[var(--border)]/70 bg-[var(--bg-0)]/60 hover:border-[var(--border)]"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="target-local"
                  name="engine-target"
                  checked={config.target === "local"}
                  onChange={() => handleSelectTarget("local")}
                  className="accent-[var(--accent)]"
                />
                <label
                  htmlFor="target-local"
                  className="font-semibold text-sm text-[var(--text)] cursor-pointer"
                >
                  💻 Local Machine (Command Prompt)
                </label>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                Free • Private • No Rate Limits
              </span>
            </div>
            <p className="text-[var(--text-dim)] leading-relaxed pl-5 mb-3">
              Route your Socratic Lens queries directly through your computer. Supports OpenCode Big-Pickle or local models via Ollama.
            </p>

            {/* Connection Status indicator */}
            <div className="ml-5 p-2.5 rounded-lg bg-[var(--bg-0)] border border-[var(--border)]/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    probing
                      ? "bg-amber-400 animate-pulse"
                      : health.online
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      : "bg-red-400"
                  }`}
                />
                <span className="text-[11px] text-[var(--text)]">
                  {probing
                    ? "Checking localhost connection…"
                    : health.online
                    ? `Connected to Local AI (${health.detectedType ?? "online"} • ${health.latencyMs}ms)`
                    : `Offline: No daemon detected at ${config.localUrl}`}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setProbing(true);
                  void probeLocalEngine(config.localUrl).then((h) => {
                    setHealth(h);
                    setProbing(false);
                  });
                }}
                className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] px-2 py-0.5 rounded border border-[var(--border)]/60 hover:border-[var(--text-dim)] transition-colors"
              >
                ⟳ Retry
              </button>
            </div>
          </div>

          {/* Quick Start Commands for Local Machine */}
          <div className="p-4 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)]/40 space-y-3">
            <h3 className="font-semibold text-[var(--text)] flex items-center justify-between">
              <span>Run on your machine in Command Prompt:</span>
              <span className="text-[10px] font-normal text-[var(--text-dim)]">
                No IDE or PowerShell needed
              </span>
            </h3>

            {/* OpenCode Big-Pickle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--accent)]">
                  1. Free OpenCode Bridge (`opencode/big-pickle`)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(OPENCODE_CMD, "opencode");
                      handleUpdateLocalConfig({ localUrl: "http://127.0.0.1:8787", localModel: "big-pickle" });
                    }}
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)]/80 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    {copiedCmd === "opencode" ? "✓ Copied" : "📋 Copy Command"}
                  </button>
                  <a
                    href="/bridge.bat"
                    download="bridge.bat"
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)]/80 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    📥 Download .bat
                  </a>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-dim)] select-all break-all">
                {OPENCODE_CMD}
              </div>
            </div>

            {/* Ollama */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[var(--text)]">
                  2. Local GPU via Ollama (`llama3.3` / `deepseek-r1`)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(OLLAMA_CMD, "ollama");
                    handleUpdateLocalConfig({ localUrl: "http://127.0.0.1:11434", localModel: "llama3.3" });
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)]/80 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {copiedCmd === "ollama" ? "✓ Copied" : "📋 Copy Command"}
                </button>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-dim)] select-all">
                {OLLAMA_CMD}
              </div>
            </div>
          </div>

          {/* Endpoint Customization */}
          {config.target === "local" && (
            <div className="p-3.5 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[var(--text)]">Local Endpoint Settings:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateLocalConfig({ localUrl: "http://127.0.0.1:8787", localModel: "big-pickle" })}
                    className="text-[10px] text-[var(--accent)] hover:underline"
                  >
                    Zen Bridge (:8787)
                  </button>
                  <span className="text-[var(--border)]">|</span>
                  <button
                    type="button"
                    onClick={() => handleUpdateLocalConfig({ localUrl: "http://127.0.0.1:11434", localModel: "llama3.3" })}
                    className="text-[10px] text-[var(--accent)] hover:underline"
                  >
                    Ollama (:11434)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[var(--text-dim)] block mb-1">Local URL</label>
                  <input
                    type="text"
                    value={config.localUrl}
                    onChange={(e) => handleUpdateLocalConfig({ localUrl: e.target.value })}
                    placeholder="http://127.0.0.1:11434"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[var(--text-dim)] block mb-1">Model ID</label>
                  <input
                    type="text"
                    value={config.localModel}
                    onChange={(e) => handleUpdateLocalConfig({ localModel: e.target.value })}
                    placeholder="llama3.3 or big-pickle"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)]/70 bg-[var(--bg-1)] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--text-dim)]">
            Active: <strong className="text-[var(--text)]">{config.target === "cloud" ? "Cloud AI" : `Local (${config.localModel})`}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-0)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

