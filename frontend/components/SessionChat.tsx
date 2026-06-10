"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThinkingMode, sendTurn, getModeColor, getModeName } from "@/lib/api";
import { MODE_PALETTES, ANIMATION } from "@/lib/tokens";

/* ============================================================
   TYPES
   ============================================================ */
interface Message {
  role: "user" | "assistant";
  content: string;
  mode?: ThinkingMode;
  confidence?: number;
  timestamp?: number;
}

interface SessionChatProps {
  sessionId: string;
  userId: string;
  initialMessage: string;
  initialResponse: string;
  initialMode: ThinkingMode;
  initialConfidence: number;
  onEndSession: (summary: any) => void;
}

/* ============================================================
   MESSAGE BUBBLE COMPONENT
   ============================================================ */
function MessageBubble({ msg, index }: { msg: Message; index: number }) {
  const isUser = msg.role === "user";
  const palette = msg.mode ? MODE_PALETTES[msg.mode] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] ${
          isUser
            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
            : "glass-card"
        }`}
        style={{
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: isUser ? "10px 16px" : "0",
          overflow: "hidden",
        }}
      >
        {!isUser && msg.mode && (
          <div
            className="h-1 w-full"
            style={{ backgroundColor: getModeColor(msg.mode) }}
          />
        )}
        <div className="p-3">
          {/* Mode badge for AI messages */}
          {!isUser && msg.mode && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getModeColor(msg.mode) }}
              />
              <span
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: getModeColor(msg.mode) }}
              >
                {getModeName(msg.mode)}
              </span>
              {msg.confidence !== undefined && (
                <span className="text-[10px] text-slate-500 font-mono">
                  {Math.round(msg.confidence * 100)}%
                </span>
              )}
            </div>
          )}

          {/* Message content */}
          <div
            className={`whitespace-pre-wrap text-sm leading-relaxed break-words ${
              isUser ? "text-white/90" : "text-slate-100"
            }`}
          >
            {msg.content}
          </div>

          {/* Timestamp */}
          {msg.timestamp && (
            <div
              className={`text-[10px] mt-1 ${
                isUser ? "text-white/40" : "text-slate-600"
              }`}
            >
              {new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   SESSION CHAT MAIN COMPONENT
   ============================================================ */
export default function SessionChat({
  sessionId,
  userId,
  initialMessage,
  initialResponse,
  initialMode,
  initialConfidence,
  onEndSession,
}: SessionChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    const list: Message[] = [];
    if (initialMessage)
      list.push({ role: "user", content: initialMessage, timestamp: Date.now() });
    list.push({
      role: "assistant",
      content: initialResponse,
      mode: initialMode,
      confidence: initialConfidence,
      timestamp: Date.now() + 100,
    });
    return list;
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom || sending) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, sending]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setInput("");
    if (/^(exit|done|bye|end|quit)$/i.test(userMsg)) {
      await handleEnd();
      return;
    }
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg, timestamp: Date.now() },
    ]);
    setSending(true);
    setError(null);
    try {
      const response = await sendTurn(sessionId, userMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.response,
          mode: response.predicted_mode,
          confidence: response.confidence,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Failed to get response");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "[Error: failed to get response. Please try again.]",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleEnd = async () => {
    if (ending) return;
    setEnding(true);
    try {
      const { endSession } = await import("@/lib/api");
      const summary = await endSession(sessionId);
      onEndSession(summary);
    } catch (err: any) {
      setError(err?.message || "Failed to end session");
      setEnding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full glass-card overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-slate-400">
            Session active
          </span>
        </div>
        <button
          onClick={handleEnd}
          disabled={ending}
          className="px-3 py-1 rounded-md border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-50 transition text-xs"
        >
          {ending ? "Ending..." : "End session"}
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-5 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-12 text-sm">
            Waiting for first message...
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <MessageBubble key={`${i}-${msg.timestamp}`} msg={msg} index={i} />
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {sending && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-3"
          >
            <div className="glass-card" style={{ borderRadius: "16px 16px 16px 4px", padding: "12px 16px" }}>
              <div className="flex items-center gap-2">
                {/* Animated brain pulse */}
                <div className="relative w-6 h-6">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-indigo-500/30"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <div className="absolute inset-0.5 rounded-full bg-surface flex items-center justify-center">
                    <svg className="w-3 h-3 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <span className="text-xs text-slate-500">Thinking...</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-3 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="border-t border-white/5 p-3 md:p-4 bg-black/20">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              placeholder="Type your response... (Enter to send)"
              rows={1}
              disabled={sending || ending}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition resize-none disabled:opacity-50 text-sm"
              style={{ minHeight: "44px", maxHeight: "160px" }}
            />
          </div>

          <div className="flex gap-1.5">
            <motion.button
              onClick={sendMessage}
              disabled={!input.trim() || sending || ending}
              className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-1.5"
              whileHover={input.trim() && !sending ? { scale: 1.03 } : {}}
              whileTap={input.trim() && !sending ? { scale: 0.97 } : {}}
            >
              <span className="hidden sm:inline">Send</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </motion.button>
          </div>
        </div>

        <div className="mt-2 text-[10px] text-slate-600 text-center hidden sm:flex items-center justify-center gap-2">
          <kbd>Enter</kbd>
          <span>to send</span>
          <span className="text-slate-700">·</span>
          <kbd>Shift</kbd>
          <span>+</span>
          <kbd>Enter</kbd>
          <span>for newline</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-600">Type</span>
          <kbd>end</kbd>
          <span>to finish</span>
        </div>
      </div>
    </div>
  );
}