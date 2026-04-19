"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  RotateCcw,
  Send,
  Terminal,
  Trophy,
  Wrench,
  Bot,
  User,
} from "lucide-react";
import StatePanel from "./StatePanel";
import type { ToolCallRecord } from "@/lib/v2/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallRecord[];
  id: string;
}

interface AgentConsoleProps {
  labId: string;
  agentName: string;
  agentIntro: string;
  stateDisplayLabel: string;
  initialState: Record<string, unknown>;
  initialToolCalls: ToolCallRecord[];
  initialSolved: boolean;
}

export default function AgentConsole({
  labId,
  agentName,
  agentIntro,
  stateDisplayLabel,
  initialState,
  initialToolCalls,
  initialSolved,
}: AgentConsoleProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: agentIntro, id: "intro" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<Record<string, unknown>>(initialState);
  const [toolCalls, setToolCalls] = useState<ToolCallRecord[]>(initialToolCalls);
  const [solved, setSolved] = useState(initialSolved);
  const [solvedMessage, setSolvedMessage] = useState("");
  const [resetting, setResetting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, solved]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || solved) return;

    const userMsg: Message = { role: "user", content: text, id: crypto.randomUUID() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/v2/labs/${labId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json() as {
        reply: string;
        toolCalls: ToolCallRecord[];
        state: Record<string, unknown>;
        solved: boolean;
        solvedMessage: string;
        error?: string;
      };

      const assistantMsg: Message = {
        role: "assistant",
        content: data.reply || "(no response)",
        toolCalls: data.toolCalls?.length ? data.toolCalls : undefined,
        id: crypto.randomUUID(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setState(data.state);
      setToolCalls((prev) => [...prev, ...(data.toolCalls ?? [])]);

      if (data.solved) {
        setSolved(true);
        setSolvedMessage(data.solvedMessage);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again.", id: crypto.randomUUID() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, solved, labId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage]
  );

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/v2/labs/${labId}/reset`, { method: "POST" });
      const data = await res.json() as { freshState: Record<string, unknown> };
      setMessages([{ role: "assistant", content: agentIntro, id: "intro" }]);
      setState(data.freshState);
      setToolCalls([]);
      setSolved(false);
      setSolvedMessage("");
      setInput("");
    } finally {
      setResetting(false);
    }
  }, [labId, agentIntro]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Chat pane */}
      <div className="lg:col-span-3 flex flex-col">
        <div className="bg-bg-card border border-border rounded-xl flex flex-col overflow-hidden" style={{ minHeight: "520px", maxHeight: "640px" }}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-accent-green/20 border border-accent-green/30 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-accent-green" />
              </div>
              <span className="text-sm font-mono text-text-primary">{agentName}</span>
              <span className="text-xs text-text-dim">· live agent</span>
            </div>
            <button
              onClick={() => void handleReset()}
              disabled={resetting}
              className="flex items-center gap-1.5 text-xs text-text-dim hover:text-text-secondary transition-colors disabled:opacity-50"
            >
              {resetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              Reset lab
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                    msg.role === "assistant"
                      ? "bg-accent-green/15 border border-accent-green/30"
                      : "bg-accent-blue/15 border border-accent-blue/30"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Bot className="w-3.5 h-3.5 text-accent-green" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-accent-blue" />
                  )}
                </div>
                <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : ""}`}>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="space-y-1">
                      {msg.toolCalls.map((tc) => (
                        <div
                          key={tc.id}
                          className="flex items-center gap-2 text-xs bg-accent-green/5 border border-accent-green/20 rounded-lg px-3 py-1.5"
                        >
                          <Wrench className="w-3 h-3 text-accent-green flex-shrink-0" />
                          <span className="font-mono text-accent-green">{tc.toolName}()</span>
                          <span className="text-text-dim">→ executed</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "assistant"
                        ? "bg-bg-secondary border border-border text-text-secondary"
                        : "bg-accent-blue/10 border border-accent-blue/20 text-text-primary"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-accent-green/15 border border-accent-green/30 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5 text-accent-green" />
                </div>
                <div className="bg-bg-secondary border border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-accent-green animate-spin" />
                  <span className="text-xs text-text-dim">Agent processing…</span>
                </div>
              </div>
            )}

            {solved && (
              <div className="border border-text-green/30 bg-text-green/5 rounded-xl p-4 flex gap-3 items-start">
                <Trophy className="w-5 h-5 text-text-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-text-green">Lab Solved</p>
                  <p className="text-xs text-text-secondary mt-1">{solvedMessage}</p>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-border p-3">
            {solved ? (
              <p className="text-xs text-text-dim text-center py-1">Lab solved — reset to try a different approach.</p>
            ) : (
              <div className="flex gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Send a message to ${agentName}…`}
                  rows={2}
                  className="flex-1 bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-dim resize-none focus:outline-none focus:border-accent-green/50 transition-colors"
                />
                <button
                  onClick={() => void sendMessage()}
                  disabled={loading || !input.trim()}
                  className="px-3 py-2 bg-accent-green/15 border border-accent-green/30 text-accent-green rounded-lg hover:bg-accent-green/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tool legend */}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-dim">
          <Terminal className="w-3 h-3" />
          <span>Tool calls execute against real state. Win condition checks actual state — no token matching.</span>
        </div>
      </div>

      {/* State & tool calls pane */}
      <div className="lg:col-span-2">
        <StatePanel
          labId={labId}
          state={state}
          toolCalls={toolCalls}
          stateDisplayLabel={stateDisplayLabel}
        />
      </div>
    </div>
  );
}
