"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, RotateCcw, Terminal as TerminalIcon } from "lucide-react";

interface TerminalCommandMeta {
  summary: string;
}

interface ReplayProgress {
  status: string;
  completedPhaseIds: string[];
  startedAt?: number;
  completedAt?: number;
}

interface TerminalProps {
  commands: Record<string, TerminalCommandMeta>;
  labId: string;
  username: string;
  onProgressChange: (progress: ReplayProgress) => void;
}

interface HistoryEntry {
  type: "input" | "output" | "error" | "system";
  content: string;
}

const BANNER = `╔══════════════════════════════════════════════════════════╗
║        HISTORICAL INCIDENT REPLAY — TERMINAL v2.0       ║
║          Type 'help' to see available commands          ║
╚══════════════════════════════════════════════════════════╝`;

function initialHistory(labId: string, username: string): HistoryEntry[] {
  return [
    { type: "system", content: BANNER },
    { type: "system", content: `[✓] Replay loaded: ${labId}` },
    { type: "system", content: `[✓] Authenticated as: ${username}` },
    { type: "system", content: "" },
  ];
}

export default function Terminal({
  commands,
  labId,
  username,
  onProgressChange,
}: TerminalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory(labId, username));
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(initialHistory(labId, username));
  }, [labId, username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function processCommand(command: string) {
    const trimmed = command.trim().toLowerCase();
    if (!trimmed) return;

    setHistory((prev) => [...prev, { type: "input", content: command }]);
    setCmdHistory((prev) => [command, ...prev]);
    setHistIdx(-1);
    setIsProcessing(true);

    if (trimmed === "clear" || trimmed === "cls") {
      setHistory(initialHistory(labId, username));
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch(`/api/labs/${labId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: "terminal", input: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setHistory((prev) => [
          ...prev,
          {
            type: "error",
            content: data.error || "Replay command failed.",
          },
          { type: "system", content: "" },
        ]);
        return;
      }

      if (data.reset) {
        setHistory([
          ...initialHistory(labId, username),
          { type: "output", content: data.output || "[✓] Replay reset" },
          { type: "system", content: "" },
        ]);
      } else {
        setHistory((prev) => [
          ...prev,
          { type: "output", content: data.output || "" },
          { type: "system", content: "" },
        ]);
      }

      if (data.progress) {
        onProgressChange(data.progress);
      }
    } catch {
      setHistory((prev) => [
        ...prev,
        {
          type: "error",
          content: "Connection error. Please try again.",
        },
        { type: "system", content: "" },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      void processCommand(input);
      setInput("");
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] ?? "");
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : (cmdHistory[next] ?? ""));
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const matches = Object.keys(commands).filter((commandKey) =>
        commandKey.startsWith(input.toLowerCase())
      );
      if (matches.length === 1) {
        setInput(matches[0]);
      }
    }
  }

  function renderLine(entry: HistoryEntry, index: number) {
    if (entry.type === "input") {
      return (
        <div key={index} className="flex items-start gap-1">
          <span className="text-accent-green font-bold select-none">
            researcher@replay:~$
          </span>
          <span className="text-text-primary ml-1">{entry.content}</span>
        </div>
      );
    }

    if (entry.type === "error") {
      return (
        <div key={index} className="text-text-red whitespace-pre-wrap">
          {entry.content}
        </div>
      );
    }

    if (entry.type === "system") {
      return (
        <div key={index} className="text-accent-cyan whitespace-pre-wrap">
          {entry.content}
        </div>
      );
    }

    return (
      <div key={index} className="whitespace-pre-wrap text-text-primary">
        {entry.content.split("\n").map((line, lineIndex) => {
          if (
            line.startsWith("[!!!]") ||
            line.includes("RCE") ||
            line.includes("destroyed") ||
            line.includes("EXFILTRATION") ||
            line.includes("exfiltration") ||
            line.includes("takeover") ||
            line.includes("command execution")
          ) {
            return (
              <div key={lineIndex} className="text-text-red font-bold">
                {line}
              </div>
            );
          }
          if (
            line.startsWith("[✓]") ||
            line.startsWith("[+]") ||
            line.includes("Mitigation active") ||
            line.includes("ready")
          ) {
            return (
              <div key={lineIndex} className="text-text-green">
                {line}
              </div>
            );
          }
          if (line.startsWith("[*]") || line.startsWith("[!]")) {
            return (
              <div key={lineIndex} className="text-text-yellow">
                {line}
              </div>
            );
          }
          if (line.startsWith("╔") || line.startsWith("║") || line.startsWith("╚")) {
            return (
              <div key={lineIndex} className="text-accent-blue">
                {line}
              </div>
            );
          }
          return <div key={lineIndex}>{line}</div>;
        })}
      </div>
    );
  }

  return (
    <div
      className="relative bg-bg-primary border border-border rounded-xl overflow-hidden flex flex-col terminal-scanline"
      style={{ height: "520px" }}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border-b border-border flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-accent-red/70" />
          <div className="w-3 h-3 rounded-full bg-text-yellow/70" />
          <div className="w-3 h-3 rounded-full bg-text-green/70" />
        </div>
        <div className="flex items-center gap-2 text-text-secondary text-xs font-mono">
          <TerminalIcon className="w-3.5 h-3.5" />
          <span>researcher@replay — {labId}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setHistory(initialHistory(labId, username));
          }}
          className="ml-auto text-text-dim hover:text-text-secondary transition-colors"
          title="Clear terminal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 terminal-text space-y-0.5">
        {history.map(renderLine)}
        {isProcessing && (
          <div className="text-accent-green animate-pulse">Processing...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-bg-secondary flex-shrink-0">
        <span className="text-accent-green font-bold font-mono text-sm select-none whitespace-nowrap">
          researcher@replay:~$
        </span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="type a replay command..."
            className="w-full bg-transparent text-text-primary font-mono text-sm outline-none placeholder-text-dim disabled:opacity-50"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-text-dim flex-shrink-0" />
      </div>
    </div>
  );
}
