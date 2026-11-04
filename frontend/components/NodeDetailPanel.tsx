"use client";

import { motion, AnimatePresence } from "framer-motion";
import { tokens } from "@/lib/tokens";

interface NodeDetailPanelProps {
  node: any | null;
  onClose: () => void;
}

function friendlyModeName(mode?: string) {
  if (!mode) return "Exploratory";
  const m = mode.toUpperCase();
  const map: Record<string, string> = {
    CONVERGENT: "Convergent Analysis",
    DIVERGENT: "Divergent Ideation",
    ANALOGICAL: "Cross-Domain Analogy",
    METACOGNITIVE: "Metacognitive Reflection",
    SYSTEMS: "Systems Modeling",
    DMN: "Default Mode (DMN)",
  };
  return map[m] || mode;
}

function modeColor(mode?: string): string {
  const key = (mode || "").toUpperCase();
  return (tokens.colors.modes as Record<string, string>)[key] || "#6C63FF";
}

function cleanConceptName(rawName?: string): string {
  if (!rawName) return "";
  let name = rawName.trim();
  const prefixes = [
    "CONVERGENT:", "DIVERGENT:", "ANALOGICAL:", "METACOGNITIVE:", "SYSTEMS:", "DMN:",
    "CONVERGENT -", "DIVERGENT -", "ANALOGICAL -", "METACOGNITIVE -", "SYSTEMS -", "DMN -",
    "MODE:", "CONCEPT:"
  ];
  for (const p of prefixes) {
    if (name.toUpperCase().startsWith(p)) {
      name = name.slice(p.length).trim();
    }
  }
  return name;
}

export default function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  if (!node) return null;

  const isSession = node.type === "session" || node.id?.startsWith?.("session-");
  const isFusion = node.type === "fusion";
  const mode = node.thinkingMode || node.modeTarget || node.mode;

  const titleCandidate = isSession
    ? (node.title || node.topic || node.name)
    : (node.concept && node.concept !== "?" ? node.concept : (node.name || node.title));
  const cleanTitle = cleanConceptName(titleCandidate) || (isSession ? "Session Detail" : "Concept Detail");

  const summaryText = cleanConceptName(node.summary || (isSession && node.name !== cleanTitle ? node.name : ""));

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute top-0 right-0 h-full w-80 z-20 overflow-y-auto"
          style={{ background: "var(--bg-1)", backdropFilter: "blur(20px)", borderLeft: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: modeColor(mode) }} />
                <span className="text-[10px] uppercase tracking-wider font-mono" style={{ color: modeColor(mode) }}>
                  {isFusion ? "Fusion" : isSession ? "Session" : "Concept"}
                </span>
              </div>
              <button onClick={onClose} className="text-[var(--text-dim)] hover:text-[var(--text)] transition text-sm cursor-pointer">
                {"\u2715"}
              </button>
            </div>
            <h3 className="text-sm font-semibold text-[var(--text)] font-mono leading-snug">
              {cleanTitle}
            </h3>
          </div>

          {/* Details */}
          <div className="p-4 space-y-4">
            {/* Mode badge */}
            {mode && (
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-full text-[10px] font-medium font-mono" style={{ background: `${modeColor(mode)}20`, color: modeColor(mode) }}>
                  {friendlyModeName(mode)}
                </div>
              </div>
            )}

            {/* Session-specific */}
            {isSession && (
              <div className="space-y-3">
                {summaryText && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Summary</span>
                    <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{summaryText}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Turns</span>
                    <p className="text-lg font-semibold text-[var(--text)]">{node.turnCount || 0}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Status</span>
                    <p className="text-xs text-[#94A3B8] capitalize">{node.status || "completed"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Concept-specific */}
            {!isSession && !isFusion && (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Domain</span>
                  <p className="text-xs text-[#94A3B8] mt-1 capitalize">{node.domain || "General"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Confidence</span>
                    <p className="text-lg font-semibold text-[var(--text)]">{Math.round((node.confidenceScore || 0) * 100)}%</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Sessions</span>
                    <p className="text-lg font-semibold text-[var(--text)]">{node.sessionCount || 0}</p>
                  </div>
                </div>
                {node.isolated && (
                  <div className="px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
                    <span className="text-[10px] text-[#FCA5A5]">Isolated concept — needs reinforcement</span>
                  </div>
                )}
              </div>
            )}

            {/* Fusion-specific */}
            {isFusion && (
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Fusion of</span>
                  <p className="text-xs text-[#C4B5FD] mt-1">
                    {node.fusionParentIds?.length || 0} parent sessions combined via VSA binding
                  </p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/20">
                  <span className="text-[10px] text-[#C4B5FD]">
                    This concept emerged from binding two session vectors in the Vector Symbolic Architecture.
                  </span>
                </div>
              </div>
            )}

            {/* Last reinforced */}
            {node.lastReinforced && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] font-mono">Last reinforced</span>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {new Date(node.lastReinforced).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
