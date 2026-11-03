"use client";

import { useState, useEffect } from "react";
import {
  readEngineConfig,
  writeEngineConfig,
  probeLocalEngine,
  DEFAULT_BYOK_MODELS,
  type EngineConfig,
  type EngineTarget,
  type ByokProvider,
  type LocalHealthResult,
} from "@/lib/workbench/engine-config";

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "cloud" | "byok" | "local" | "mcp";

export default function ModelSettingsModal({
  isOpen,
  onClose,
}: ModelSettingsModalProps) {
  const [config, setConfig] = useState<EngineConfig>(readEngineConfig);
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const c = readEngineConfig();
    return c.target === "byok" ? "byok" : c.target === "local" ? "local" : "cloud";
  });
  const [showKey, setShowKey] = useState(false);
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

  function handleSelectTarget(target: EngineTarget) {
    const updated = writeEngineConfig({ target });
    setConfig(updated);
  }

  function handleUpdateConfig(updates: Partial<EngineConfig>) {
    const updated = writeEngineConfig(updates);
    setConfig(updated);
  }

  function handleByokProviderChange(provider: ByokProvider) {
    const defaultModel = DEFAULT_BYOK_MODELS[provider] || "default";
    handleUpdateConfig({
      byokProvider: provider,
      byokModel: defaultModel,
    });
  }

  function copyToClipboard(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  }

  const OPENCODE_CMD = `curl -sL https://cog-research.vercel.app/bridge.bat -o bridge.bat && bridge.bat`;
  const OLLAMA_CMD = `ollama run llama3.3`;
  const CLAUDE_MCP_CMD = `claude mcp add yentellect http://127.0.0.1:8787/mcp`;
  const CLINE_MCP_SNIPPET = `{\n  "mcpServers": {\n    "yentellect": {\n      "url": "http://127.0.0.1:8787/mcp"\n    }\n  }\n}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-engine-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--bg-1)] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]/70 bg-[var(--bg-1)] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base text-[var(--accent)]">⚡</span>
            <h2
              id="modal-engine-title"
              className="text-sm font-semibold text-[var(--text)] tracking-tight"
            >
              AI Engine, BYOK & Agent Integrations
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--bg-2)] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 pb-2 border-b border-[var(--border)]/50 bg-[var(--bg-0)]/50 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("cloud")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "cloud"
                ? "bg-[var(--bg-2)] text-[var(--text)] font-semibold shadow-2xs"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            🌐 Cloud AI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("byok")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "byok"
                ? "bg-[var(--bg-2)] text-[var(--text)] font-semibold shadow-2xs"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            🔑 Bring Your Own Key
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("local")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "local"
                ? "bg-[var(--bg-2)] text-[var(--text)] font-semibold shadow-2xs"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            💻 Local Machine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("mcp")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "mcp"
                ? "bg-[var(--bg-2)] text-[var(--text)] font-semibold shadow-2xs"
                : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}
          >
            🤖 Coding Agents (MCP)
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: CLOUD AI */}
          {activeTab === "cloud" && (
            <div className="space-y-4">
              <div
                onClick={() => handleSelectTarget("cloud")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  config.target === "cloud"
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-2xs"
                    : "border-[var(--border)]/70 bg-[var(--bg-0)]/60 hover:border-[var(--border)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="opt-cloud"
                      checked={config.target === "cloud"}
                      onChange={() => handleSelectTarget("cloud")}
                      className="accent-[var(--accent)]"
                    />
                    <label htmlFor="opt-cloud" className="font-semibold text-sm text-[var(--text)] cursor-pointer">
                      Hosted Free Infrastructure
                    </label>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--accent)]/15 text-[var(--accent)]">
                    Default • Zero Setup
                  </span>
                </div>
                <p className="text-[var(--text-dim)] leading-relaxed pl-5">
                  Runs directly on ultra-fast cloud inference (Groq Llama 3.3 70B & Gemini 2.0 Flash). No terminal, keys, or local compute required. Completely free for all visitors.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)] space-y-2">
                <h4 className="font-semibold text-[var(--text)]">Cloud Model Highlights:</h4>
                <ul className="space-y-1.5 text-[var(--text-dim)] list-disc pl-4 leading-relaxed">
                  <li><strong>Llama 3.3 70B Versatile</strong>: Meta&apos;s leading open weights reasoning engine running at ~500 tokens/sec.</li>
                  <li><strong>Gemini 2.0 Flash</strong>: 1M token context for long mathematical proofs and multi-paper synthesis.</li>
                  <li><strong>Zero Rate Limits</strong>: Built-in failover ensuring unbroken research flow.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: BRING YOUR OWN KEY (BYOK) */}
          {activeTab === "byok" && (
            <div className="space-y-4">
              <div
                onClick={() => handleSelectTarget("byok")}
                className={`cursor-pointer rounded-xl border p-4 transition-all ${
                  config.target === "byok"
                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-2xs"
                    : "border-[var(--border)]/70 bg-[var(--bg-0)]/60 hover:border-[var(--border)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="opt-byok"
                      checked={config.target === "byok"}
                      onChange={() => handleSelectTarget("byok")}
                      className="accent-[var(--accent)]"
                    />
                    <label htmlFor="opt-byok" className="font-semibold text-sm text-[var(--text)] cursor-pointer">
                      Use Your Personal API Key
                    </label>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/15 text-purple-400">
                    Claude 3.5 • GPT-4o • DeepSeek
                  </span>
                </div>
                <p className="text-[var(--text-dim)] leading-relaxed pl-5">
                  Direct client-side fetch from your browser to the AI provider. Keys are stored strictly in your browser&apos;s localStorage and never touch our servers.
                </p>
              </div>

              {/* Provider & Key Configuration Form */}
              <div className="p-4 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                      AI Provider
                    </label>
                    <select
                      value={config.byokProvider}
                      onChange={(e) => {
                        handleByokProviderChange(e.target.value as ByokProvider);
                        if (config.target !== "byok") handleSelectTarget("byok");
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
                    >
                      <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                      <option value="openai">OpenAI (GPT-4o / o1)</option>
                      <option value="openrouter">OpenRouter (DeepSeek R1 / All)</option>
                      <option value="groq">Groq (Personal Free Key)</option>
                      <option value="gemini">Google Gemini (Flash / Pro)</option>
                      <option value="custom">Custom OpenAI-Compatible</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      value={config.byokModel}
                      onChange={(e) => handleUpdateConfig({ byokModel: e.target.value })}
                      placeholder="e.g. claude-3-5-sonnet-20241022"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono"
                    />
                  </div>
                </div>

                {config.byokProvider === "custom" && (
                  <div>
                    <label className="text-[11px] font-medium text-[var(--text)] block mb-1">
                      Base Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={config.byokBaseUrl || ""}
                      onChange={(e) => handleUpdateConfig({ byokBaseUrl: e.target.value })}
                      placeholder="https://your-api.com/v1"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-medium text-[var(--text)]">
                      {config.byokProvider.toUpperCase()} API Key
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] cursor-pointer"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={config.byokApiKey}
                    onChange={(e) => {
                      handleUpdateConfig({ byokApiKey: e.target.value });
                      if (config.target !== "byok") handleSelectTarget("byok");
                    }}
                    placeholder={`Paste your ${config.byokProvider} key here…`}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-1)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--accent)] font-mono"
                  />
                </div>

                <div className="pt-1 flex items-center justify-between text-[11px] text-[var(--text-dim)]">
                  <span>🔒 100% Client-Side Storage</span>
                  {config.byokApiKey ? (
                    <span className="text-emerald-400 font-medium">✓ Key Saved</span>
                  ) : (
                    <span className="text-amber-400">Required for BYOK</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCAL MACHINE */}
          {activeTab === "local" && (
            <div className="space-y-4">
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
                      id="opt-local"
                      checked={config.target === "local"}
                      onChange={() => handleSelectTarget("local")}
                      className="accent-[var(--accent)]"
                    />
                    <label htmlFor="opt-local" className="font-semibold text-sm text-[var(--text)] cursor-pointer">
                      Local Machine / Command Prompt Bridge
                    </label>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
                    Free • Unlimited • Offline
                  </span>
                </div>
                <p className="text-[var(--text-dim)] leading-relaxed pl-5 mb-3">
                  Execute Socratic Lens queries on your local computer via Ollama or the OpenCode bridge.
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
                    className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)] px-2 py-0.5 rounded border border-[var(--border)]/60 hover:border-[var(--text-dim)] transition-colors cursor-pointer"
                  >
                    ⟳ Retry
                  </button>
                </div>
              </div>

              {/* Commands */}
              <div className="p-4 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)]/40 space-y-3">
                <h4 className="font-semibold text-[var(--text)]">Run in Windows Command Prompt:</h4>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--accent)]">
                      1. OpenCode Bridge (`big-pickle`)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(OPENCODE_CMD, "opencode");
                        handleUpdateConfig({ localUrl: "http://127.0.0.1:8787", localModel: "big-pickle" });
                      }}
                      className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)]/80 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    >
                      {copiedCmd === "opencode" ? "✓ Copied" : "📋 Copy Command"}
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-dim)] select-all break-all">
                    {OPENCODE_CMD}
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[var(--border)]/40">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[var(--text)]">
                      2. Local GPU via Ollama (`llama3.3`)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(OLLAMA_CMD, "ollama");
                        handleUpdateConfig({ localUrl: "http://127.0.0.1:11434", localModel: "llama3.3" });
                      }}
                      className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)]/80 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                    >
                      {copiedCmd === "ollama" ? "✓ Copied" : "📋 Copy Command"}
                    </button>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-0)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-dim)] select-all">
                    {OLLAMA_CMD}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CODING AGENTS (MCP) */}
          {activeTab === "mcp" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[var(--border)]/70 bg-[var(--bg-0)] space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-[var(--text)] flex items-center gap-1.5">
                    <span>🔌 Model Context Protocol (MCP)</span>
                  </h3>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                    Claude Code • Cline • Cursor
                  </span>
                </div>
                <p className="text-[var(--text-dim)] leading-relaxed">
                  Connect developer agents like Claude Code and Cline directly to your Research Workbench. Agents can read the active paper equations, inspect Socratic analogies, and write simulations.
                </p>
              </div>

              {/* Claude Code */}
              <div className="p-3.5 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text)]">1. Claude Code CLI</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(CLAUDE_MCP_CMD, "claudemcp")}
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                  >
                    {copiedCmd === "claudemcp" ? "✓ Copied" : "📋 Copy Terminal Command"}
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-1)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-dim)] select-all break-all">
                  {CLAUDE_MCP_CMD}
                </div>
              </div>

              {/* Cline / Roo Code */}
              <div className="p-3.5 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[var(--text)]">2. Cline / Cursor Config</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(CLINE_MCP_SNIPPET, "clinemcp")}
                    className="text-[10px] px-2 py-0.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                  >
                    {copiedCmd === "clinemcp" ? "✓ Copied" : "📋 Copy JSON"}
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-[var(--bg-1)] border border-[var(--border)] font-mono text-[10px] text-[var(--text-dim)] overflow-x-auto">
                  {CLINE_MCP_SNIPPET}
                </pre>
              </div>

              {/* Tools Exposed */}
              <div className="p-3.5 rounded-xl border border-[var(--border)]/60 bg-[var(--bg-0)] space-y-1.5">
                <span className="font-medium text-[var(--text)] block">Tools Provided to Agents:</span>
                <ul className="space-y-1 text-[11px] text-[var(--text-dim)] list-disc pl-4 leading-relaxed">
                  <li><code className="text-[var(--text)] font-mono">yentellect_get_current_paper</code>: Reads paper equations and text.</li>
                  <li><code className="text-[var(--text)] font-mono">yentellect_get_socratic_connections</code>: Fetches analogical and systems mappings.</li>
                  <li><code className="text-[var(--text)] font-mono">yentellect_ask_lens</code>: Queries the Socratic Lens from agent terminal.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)]/70 bg-[var(--bg-1)] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[var(--text-dim)]">
            Active: <strong className="text-[var(--text)]">
              {config.target === "cloud"
                ? "Cloud AI (Hosted)"
                : config.target === "byok"
                ? `BYOK (${config.byokProvider.toUpperCase()}: ${config.byokModel})`
                : `Local Machine (${config.localModel})`}
            </strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--bg-0)] font-semibold text-xs hover:opacity-90 transition-opacity shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
