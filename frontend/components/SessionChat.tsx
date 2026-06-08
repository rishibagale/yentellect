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
    if (initialMessage) {
      list.push({ role: "user", content: initialMessage });
    }
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
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
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

    // Check for exit keywords
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
        {
          role: "assistant",
          content:
            "[Error: Failed to get response. Please try again or end the session.]",
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

  const charCount = input.length;
  const MAX_INPUT = 2000;

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-slate-200/50 dark:border-slate-700/50">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin"
      >
        {messages.length === 0 && (
          <div className="text-center text-slate-400 dark:text-slate-500 py-12 text-sm">
            Waiting for the first message...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
          >
            <div
              className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-700/70 text-slate-900 dark:text-slate-100"
              }`}
            >
              {msg.role === "assistant" && msg.mode && (
                <div
                  className="text-xs uppercase tracking-wider mb-1.5 font-semibold"
                  style={{ color: getModeColor(msg.mode) }}
                >
                  {getModeName(msg.mode)}
                  {msg.confidence !== undefined && (
                    <span className="ml-2 text-slate-400 dark:text-slate-500 font-normal normal-case">
                      {Math.round(msg.confidence * 100)}% confidence
                    </span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed break-words">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-slate-100 dark:bg-slate-700/70 rounded-2xl px-4 py-3 flex space-x-1.5 items-center">
              <div
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
              <span className="text-xs text-slate-400 ml-2">
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="border-t border-slate-200/50 dark:border-slate-700/50 p-3 md:p-4 bg-white/50 dark:bg-slate-900/30">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) =>
                setInput(e.target.value.slice(0, MAX_INPUT))
              }
              onKeyDown={handleKeyDown}
              placeholder="Type your response... (Enter to send, Shift+Enter for newline)"
              rows={1}
              disabled={sending || ending}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none disabled:opacity-50 text-sm placeholder:text-slate-400"
              style={{ minHeight: "44px", maxHeight: "160px" }}
            />
            {charCount > MAX_INPUT * 0.8 && (
              <div className="absolute bottom-1 right-2 text-xs text-slate-400">
                {charCount}/{MAX_INPUT}
              </div>
            )}
          </div>
          <div className="flex flex-col space-y-1.5">
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || ending}
              aria-label="Send message"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm text-sm flex items-center gap-1"
            >
              <span className="hidden sm:inline">Send</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
            <button
              onClick={handleEnd}
              disabled={ending}
              aria-label="End session"
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition text-xs"
            >
              {ending ? "Ending..." : "End"}
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 text-center hidden sm:block">
          Press{" "}
          <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
            Enter
          </kbd>{" "}
          to send • Type{" "}
          <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
            end
          </kbd>{" "}
          to finish
        </div>
      </div>
    </div>
  );
}
