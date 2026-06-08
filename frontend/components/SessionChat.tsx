"use client";

import { useEffect, useRef, useState } from "react";
import { ThinkingMode, sendTurn, getModeColor, getModeName } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  mode?: ThinkingMode;
  confidence?: number;
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
    if (initialMessage) list.push({ role: "user", content: initialMessage });
    list.push({
      role: "assistant",
      content: initialResponse,
      mode: initialMode,
      confidence: initialConfidence,
    });
    return list;
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

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
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
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
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Failed to get response");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "[Error: failed to get response. Please try again.]" },
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
    <div className="flex flex-col h-full bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-12 text-sm">Waiting for first message…</div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            <div
              className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white/5 border border-white/10 text-slate-100"
              }`}
            >
              {msg.role === "assistant" && msg.mode && (
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getModeColor(msg.mode) }} />
                  <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: getModeColor(msg.mode) }}>
                    {getModeName(msg.mode)}
                  </div>
                  {msg.confidence !== undefined && (
                    <span className="text-[10px] text-slate-500">
                      {Math.round(msg.confidence * 100)}%
                    </span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">{msg.content}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex space-x-1.5 items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-xs text-slate-500 ml-2">Thinking…</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg">{error}</div>
      )}

      <div className="border-t border-white/5 p-3 md:p-4 bg-black/20">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              placeholder="Type your response… (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={sending || ending}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition resize-none disabled:opacity-50 text-sm"
              style={{ minHeight: "44px", maxHeight: "160px" }}
            />
          </div>
          <div className="flex flex-col space-y-1.5">
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || ending}
              aria-label="Send message"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-1"
            >
              <span className="hidden sm:inline">Send</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
            <button
              onClick={handleEnd}
              disabled={ending}
              aria-label="End session"
              className="px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white disabled:opacity-50 transition text-xs"
            >
              {ending ? "Ending…" : "End"}
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-500 text-center hidden sm:block">
          <kbd className="px-1 py-0.5 rounded bg-white/5 text-slate-400 font-mono text-[10px]">Enter</kbd> to send · type{" "}
          <kbd className="px-1 py-0.5 rounded bg-white/5 text-slate-400 font-mono text-[10px]">end</kbd> to finish
        </div>
      </div>
    </div>
  );
}
