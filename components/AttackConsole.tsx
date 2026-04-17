"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Loader2,
  RotateCcw,
  Send,
  ShieldAlert,
  Trophy,
  User,
} from "lucide-react";

interface AttackMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ReplayAttackConfig {
  targetName: string;
  targetDescription: string;
  briefing: string;
  intro: string;
  placeholder: string;
}

interface ReplayProgress {
  status: string;
  completedPhaseIds: string[];
  startedAt?: number;
  completedAt?: number;
}

interface AttackConsoleProps {
  labId: string;
  attackConfig: ReplayAttackConfig;
  objectiveReached: boolean;
  hasExploitMode: boolean;
  onProgressChange: (progress: ReplayProgress) => void;
}

export default function AttackConsole({
  labId,
  attackConfig,
  objectiveReached,
  hasExploitMode,
  onProgressChange,
}: AttackConsoleProps) {
  const [messages, setMessages] = useState<AttackMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [exploitSucceeded, setExploitSucceeded] = useState(false);
  const [winMessage, setWinMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const missionLabel = useMemo(
    () => attackConfig.targetName.toUpperCase(),
    [attackConfig.targetName]
  );

  useEffect(() => {
    void loadMessages();
  }, [labId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, objectiveReached, exploitSucceeded]);

  async function loadMessages() {
    setFetching(true);
    try {
      if (hasExploitMode) {
        const res = await fetch(`/api/labs/${labId}/chat`);
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          role: string;
          content: string;
        }>;
        setMessages(
          data.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      } else {
        const res = await fetch(`/api/labs/${labId}/events`);
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          surface: string;
          eventType: string;
          detail: string;
        }>;
        setMessages(
          data
            .filter(
              (event) =>
                event.surface === "attack" &&
                (event.eventType === "user_message" ||
                  event.eventType === "assistant_message")
            )
            .map((event) => ({
              role:
                event.eventType === "user_message"
                  ? ("user" as const)
                  : ("assistant" as const),
              content: event.detail,
            }))
        );
      }
    } finally {
      setFetching(false);
    }
  }

  async function sendAttack() {
    const text = input.trim();
    if (!text || loading || objectiveReached || exploitSucceeded) return;

    const userMessage: AttackMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      if (hasExploitMode) {
        // Send to the LLM-based exploit endpoint
        const res = await fetch(`/api/labs/${labId}/exploit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${data.error || "Exploit request failed"}`,
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply || "No response from target.",
          },
        ]);

        if (data.exploitSucceeded) {
          setExploitSucceeded(true);
          setWinMessage(data.winMessage ?? "Exploit succeeded.");
        }

        if (data.progress) {
          onProgressChange(data.progress);
        }
      } else {
        // Fall back to replay-based pattern matching
        const res = await fetch(`/api/labs/${labId}/replay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surface: "attack", input: text }),
        });
        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${data.error || "Replay action failed"}`,
            },
          ]);
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply || "No replay response returned.",
          },
        ]);
        onProgressChange(data.progress);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function resetAttack() {
    setLoading(true);
    try {
      if (hasExploitMode) {
        await fetch(`/api/labs/${labId}/exploit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "reset" }),
        });
      }
      const res = await fetch(`/api/labs/${labId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages([]);
        setExploitSucceeded(false);
        setWinMessage("");
        onProgressChange(data.progress);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendAttack();
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
  }

  const isComplete = objectiveReached || exploitSucceeded;

  return (
    <div className="bg-bg-card border border-red-900/40 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-900/40 bg-red-950/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <Crosshair className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">
              {attackConfig.targetName}
            </div>
            <div className="text-xs text-text-dim font-mono">
              {attackConfig.targetDescription}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasExploitMode && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/25 text-red-400 font-mono">
              LIVE LLM
            </span>
          )}
          <button
            onClick={resetAttack}
            className="text-text-dim hover:text-text-primary transition-colors p-1 rounded"
            title="Reset attack"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-red-900/30 bg-red-950/10 px-4 py-3">
        <div className="flex items-center gap-2 text-red-400 text-xs font-mono mb-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          {missionLabel} {hasExploitMode ? "LIVE TARGET" : "HISTORICAL REPLAY"}
        </div>
        <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">
          {attackConfig.briefing}
        </p>
      </div>

      <div className="px-4 py-3 border-b border-border bg-bg-secondary">
        <p className="text-xs text-text-dim">{attackConfig.intro}</p>
      </div>

      <div className="min-h-[320px] max-h-[480px] overflow-y-auto px-4 py-4 space-y-4">
        {fetching && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-text-dim animate-spin" />
          </div>
        )}

        {!fetching && messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
              <Crosshair className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-text-secondary text-sm font-mono">
              {hasExploitMode
                ? "Target is live. Craft your attack."
                : "Historical replay armed."}
            </p>
            <p className="text-text-dim text-xs mt-1">
              {hasExploitMode
                ? "You are attacking a real LLM with a vulnerable system prompt."
                : "Submit the attack input that matches the documented chain."}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "assistant" && (
              <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Crosshair className="w-4 h-4 text-red-400" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                message.role === "user"
                  ? "bg-red-500/10 border border-red-500/20 text-text-primary"
                  : "bg-bg-secondary border border-border text-text-primary"
              }`}
            >
              {message.content}
            </div>
            {message.role === "user" && (
              <div className="w-7 h-7 rounded-lg bg-accent-blue/15 border border-accent-blue/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4 text-accent-blue" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <Crosshair className="w-4 h-4 text-red-400" />
            </div>
            <div className="bg-bg-secondary border border-border rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" />
                <span
                  className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {isComplete && (
        <div className="mx-4 mb-4 rounded-xl border border-accent-green/40 bg-accent-green/5 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-green/15 border border-accent-green/30 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-accent-green" />
            </div>
            <div>
              <div className="text-sm font-semibold text-accent-green">
                {exploitSucceeded ? "EXPLOIT SUCCEEDED" : "Historical chain reproduced"}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {exploitSucceeded
                  ? winMessage
                  : "The replay engine marked the objective phase complete. Use the defense tab to validate where the mitigation breaks this chain."}
              </p>
              {exploitSucceeded && (
                <button
                  onClick={resetAttack}
                  className="mt-2 text-xs text-text-dim hover:text-text-secondary underline transition-colors"
                >
                  Reset and try again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-t border-red-900/40 bg-red-950/10">
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading || isComplete}
            placeholder={
              isComplete
                ? "Objective complete — reset to try again"
                : attackConfig.placeholder
            }
            rows={1}
            className="flex-1 bg-bg-card border border-red-900/40 focus:border-red-500/50 rounded-lg px-3 py-2.5 text-text-primary placeholder-text-dim text-sm resize-none outline-none transition-colors min-h-[40px] font-mono disabled:opacity-40"
            style={{ maxHeight: "180px" }}
          />
          <button
            onClick={sendAttack}
            disabled={loading || !input.trim() || isComplete}
            className="w-9 h-9 rounded-lg bg-red-500/80 hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </button>
        </div>
        <p className="text-text-dim text-xs mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
