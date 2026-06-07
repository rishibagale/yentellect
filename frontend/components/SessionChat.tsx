"use client";

import { useEffect, useRef, useState } from "react";
import { ThinkingMode, sendTurn, getModeColor } from "@/lib/api";
import ModeIndicator from "./ModeIndicator";

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
  const [messages, setMessages] = useState<Message[]>([
    { role: "user", content: initialMessage },
    {
      role: "assistant",
      content: initialResponse,
      mode: initialMode,
      confidence: initialConfidence,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [currentMode, setCurrentMode] = useState<ThinkingMode>(initialMode);
  const [currentConfidence, setCurrentConfidence] = useState(initialConfidence);
  const [ending, setEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

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
      setCurrentMode(response.predicted_mode);
      setCurrentConfidence(response.confidence);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "[Error: Failed to get response. Please try again.]",
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
    } catch (err) {
      console.error("Failed to end session:", err);
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
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin"
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-slide-up`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              }`}
            >
              {msg.role === "assistant" && msg.mode && (
                <div className="text-xs uppercase tracking-wider mb-1 opacity-70">
                  {msg.mode.charAt(0) + msg.mode.slice(1).toLowerCase()}
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3 flex space-x-2">
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
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="flex space-x-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your response... (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={sending || ending}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition resize-none disabled:opacity-50"
          />
          <div className="flex flex-col space-y-2">
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending || ending}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Send
            </button>
            <button
              onClick={handleEnd}
              disabled={ending}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition text-sm"
            >
              {ending ? "Ending..." : "End"}
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700">Enter</kbd> to send • Type "end" to finish
        </div>
      </div>
    </div>
  );
}