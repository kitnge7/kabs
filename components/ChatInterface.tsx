"use client";

import { useState, useEffect, useRef } from "react";
import { Bot, User, Send, Trash2, Loader2, Crosshair, ShieldAlert, ChevronDown, ChevronUp, Trophy } from "lucide-react";

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

export interface ExploitConfig {
  targetName: string;
  targetDescription: string;
  attackContext: string;
  winMessage: string;
  winTaskId: string;
}

interface ChatInterfaceProps {
  labId: string;
  exploitConfig?: ExploitConfig | null;
  onExploitSuccess?: (taskId: string) => void;
}

export default function ChatInterface({ labId, exploitConfig, onExploitSuccess }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [exploitSucceeded, setExploitSucceeded] = useState(false);
  const [winMessage, setWinMessage] = useState("");
  const [contextOpen, setContextOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isExploitMode = Boolean(exploitConfig);

  useEffect(() => {
    loadHistory();
  }, [labId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, exploitSucceeded]);

  async function loadHistory() {
    setFetching(true);
    try {
      const res = await fetch(`/api/labs/${labId}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } finally {
      setFetching(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || exploitSucceeded) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`/api/labs/${labId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);

        if (data.exploitSucceeded) {
          setExploitSucceeded(true);
          setWinMessage(data.winMessage ?? "Exploit succeeded.");
          if (data.winTaskId && onExploitSuccess) {
            onExploitSuccess(data.winTaskId);
          }
        }
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: `Error: ${data.error || "Failed to get response"}` },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function clearChat() {
    await fetch(`/api/labs/${labId}/chat`, { method: "DELETE" });
    setMessages([]);
    setExploitSucceeded(false);
    setWinMessage("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  // ── Exploit-mode header ──────────────────────────────────────────────────
  const ExploitHeader = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/40 bg-red-950/20 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
          <Crosshair className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{exploitConfig!.targetName}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400 font-mono">ATTACK MODE</span>
          </div>
          <div className="text-xs text-text-dim font-mono">{exploitConfig!.targetDescription}</div>
        </div>
      </div>
      <button
        onClick={clearChat}
        className="text-text-dim hover:text-red-400 transition-colors p-1 rounded"
        title="Reset conversation"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  // ── Guide-mode header ────────────────────────────────────────────────────
  const GuideHeader = () => (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-accent-green/15 border border-accent-green/25 flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent-green" />
        </div>
        <div>
          <div className="text-sm font-semibold text-text-primary">AI Security Guide</div>
          <div className="text-xs text-accent-green">● online</div>
        </div>
      </div>
      <button
        onClick={clearChat}
        className="text-text-dim hover:text-text-red transition-colors p-1 rounded"
        title="Clear conversation"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  // ── Attack context panel ─────────────────────────────────────────────────
  const AttackContext = () => (
    <div className="border-b border-red-900/30 bg-red-950/10 flex-shrink-0">
      <button
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
        onClick={() => setContextOpen((o) => !o)}
      >
        <span className="flex items-center gap-1.5 font-mono">
          <ShieldAlert className="w-3.5 h-3.5" /> MISSION BRIEFING
        </span>
        {contextOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {contextOpen && (
        <div className="px-4 pb-3">
          <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed font-mono border-l-2 border-red-500/30 pl-3">
            {exploitConfig!.attackContext}
          </p>
        </div>
      )}
    </div>
  );

  // ── Win overlay ──────────────────────────────────────────────────────────
  const WinBanner = () => (
    <div className="mx-4 my-3 rounded-xl border border-accent-green/40 bg-accent-green/5 p-4 flex-shrink-0">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-green/15 border border-accent-green/30 flex items-center justify-center flex-shrink-0">
          <Trophy className="w-4 h-4 text-accent-green" />
        </div>
        <div>
          <div className="text-sm font-bold text-accent-green mb-1">EXPLOIT SUCCEEDED</div>
          <p className="text-xs text-text-secondary leading-relaxed">{winMessage}</p>
          <button
            onClick={clearChat}
            className="mt-2 text-xs text-text-dim hover:text-text-secondary underline transition-colors"
          >
            Reset and try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`flex flex-col border rounded-xl overflow-hidden ${
        isExploitMode
          ? "bg-bg-card border-red-900/40"
          : "bg-bg-card border-border"
      }`}
      style={{ minHeight: "500px", maxHeight: "700px" }}
    >
      {isExploitMode ? <ExploitHeader /> : <GuideHeader />}
      {isExploitMode && <AttackContext />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {fetching && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-text-dim animate-spin" />
          </div>
        )}

        {!fetching && messages.length === 0 && !isExploitMode && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-accent-green" />
            </div>
            <p className="text-text-secondary text-sm">Ask the AI guide anything about this lab.</p>
            <p className="text-text-dim text-xs mt-1">Hints, technical explanations, defenses...</p>
          </div>
        )}

        {!fetching && messages.length === 0 && isExploitMode && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
              <Crosshair className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-text-secondary text-sm font-mono">Target is live.</p>
            <p className="text-text-dim text-xs mt-1">Send your first message to begin the attack.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 message-enter ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                isExploitMode
                  ? "bg-red-500/10 border border-red-500/20"
                  : "bg-accent-green/15 border border-accent-green/25"
              }`}>
                {isExploitMode
                  ? <Crosshair className="w-4 h-4 text-red-400" />
                  : <Bot className="w-4 h-4 text-accent-green" />
                }
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? isExploitMode
                    ? "bg-red-500/10 border border-red-500/20 text-text-primary"
                    : "bg-accent-green/15 border border-accent-green/25 text-text-primary"
                  : "bg-bg-secondary border border-border text-text-primary"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-accent-blue" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start message-enter">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isExploitMode
                ? "bg-red-500/10 border border-red-500/20"
                : "bg-accent-green/15 border border-accent-green/25"
            }`}>
              {isExploitMode
                ? <Crosshair className="w-4 h-4 text-red-400" />
                : <Bot className="w-4 h-4 text-accent-green" />
              }
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {exploitSucceeded && <WinBanner />}

      {/* Input */}
      <div className={`px-4 py-3 border-t flex-shrink-0 ${
        isExploitMode ? "border-red-900/40 bg-red-950/10" : "border-border bg-bg-secondary"
      }`}>
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading || exploitSucceeded}
            placeholder={
              exploitSucceeded
                ? "Exploit complete — reset to try again"
                : isExploitMode
                ? "Craft your attack payload..."
                : "Ask about the vulnerability, request hints, or discuss defenses..."
            }
            rows={1}
            className={`flex-1 bg-bg-card border rounded-lg px-3 py-2.5 text-text-primary placeholder-text-dim text-sm resize-none outline-none transition-colors min-h-[40px] font-mono disabled:opacity-40 ${
              isExploitMode
                ? "border-red-900/40 focus:border-red-500/50"
                : "border-border focus:border-accent-green/50"
            }`}
            style={{ maxHeight: "160px" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || exploitSucceeded}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 ${
              isExploitMode
                ? "bg-red-500/80 hover:bg-red-500"
                : "bg-accent-green hover:bg-accent-green-dim"
            }`}
          >
            {loading
              ? <Loader2 className="w-4 h-4 text-white animate-spin" />
              : <Send className="w-4 h-4 text-white" />
            }
          </button>
        </div>
        <p className="text-text-dim text-xs mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
