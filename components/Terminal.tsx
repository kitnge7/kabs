"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal as TerminalIcon, RotateCcw, ChevronRight } from "lucide-react";

interface TerminalCommand {
  output: string;
  delay?: number;
  completedOutput?: string;
  completedWhen?: string;
}

interface TerminalProps {
  commands: Record<string, TerminalCommand>;
  labId: string;
  username: string;
  completedTasks?: string[];
}

interface HistoryEntry {
  type: "input" | "output" | "error" | "system";
  content: string;
}

const BANNER = `╔══════════════════════════════════════════════════════════╗
║          AI SECURITY RESEARCH LAB — TERMINAL v1.0        ║
║          Type 'help' to see available commands           ║
╚══════════════════════════════════════════════════════════╝`;

export default function Terminal({ commands, labId, username, completedTasks = [] }: TerminalProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { type: "system", content: BANNER },
    { type: "system", content: `[✓] Lab environment loaded: ${labId}` },
    { type: "system", content: `[✓] Authenticated as: ${username}` },
    { type: "system", content: "" },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const processCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim().toLowerCase();
      if (!trimmed) return;

      setHistory((h) => [...h, { type: "input", content: cmd }]);
      setCmdHistory((h) => [cmd, ...h]);
      setHistIdx(-1);
      setIsProcessing(true);

      await new Promise((r) => setTimeout(r, 80));

      if (trimmed === "clear" || trimmed === "cls") {
        setHistory([{ type: "system", content: BANNER }]);
        setIsProcessing(false);
        return;
      }

      // Find matching command (exact or partial prefix match)
      const match = Object.entries(commands).find(
        ([key]) => key === trimmed || trimmed === key
      );

      if (match) {
        const [, cmd_def] = match;
        if (cmd_def.delay) {
          await new Promise((r) => setTimeout(r, cmd_def.delay));
        }
        const output =
          cmd_def.completedWhen &&
          cmd_def.completedOutput &&
          completedTasks.includes(cmd_def.completedWhen)
            ? cmd_def.completedOutput
            : cmd_def.output;
        setHistory((h) => [...h, { type: "output", content: output }, { type: "system", content: "" }]);
      } else {
        setHistory((h) => [
          ...h,
          {
            type: "error",
            content: `Command not found: ${trimmed}\nType 'help' for a list of available commands.`,
          },
          { type: "system", content: "" },
        ]);
      }

      setIsProcessing(false);
    },
    [commands, completedTasks]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      processCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(next);
      setInput(cmdHistory[next] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? "" : (cmdHistory[next] ?? ""));
    } else if (e.key === "Tab") {
      e.preventDefault();
      const matches = Object.keys(commands).filter((k) =>
        k.startsWith(input.toLowerCase())
      );
      if (matches.length === 1) setInput(matches[0]);
    }
  }

  function renderLine(entry: HistoryEntry, idx: number) {
    if (entry.type === "input") {
      return (
        <div key={idx} className="flex items-start gap-1">
          <span className="text-accent-green font-bold select-none">
            researcher@ai-lab:~$
          </span>
          <span className="text-text-primary ml-1">{entry.content}</span>
        </div>
      );
    }
    if (entry.type === "error") {
      return (
        <div key={idx} className="text-text-red whitespace-pre-wrap">
          {entry.content}
        </div>
      );
    }
    if (entry.type === "system") {
      return (
        <div key={idx} className="text-accent-cyan whitespace-pre-wrap">
          {entry.content}
        </div>
      );
    }
    // output — parse for colour codes
    return (
      <div key={idx} className="whitespace-pre-wrap text-text-primary">
        {entry.content.split("\n").map((line, li) => {
          if (line.startsWith("[!!!]") || line.includes("HACKED") || line.includes("EXPLOIT") || line.includes("EXECUTED") || line.includes("EXFILTRATED") || line.includes("DRAINED") || line.includes("DELETED") || line.includes("RCE CONFIRMED") || line.includes("BREACH") || line.includes("COMPROMISED")) {
            return <div key={li} className="text-text-red font-bold">{line}</div>;
          }
          if (line.startsWith("[✓]") || line.startsWith("[+]") || line.includes("BLOCKED") || line.includes("PATCHED") || line.includes("normal startup")) {
            return <div key={li} className="text-text-green">{line}</div>;
          }
          if (line.startsWith("[*]") || line.startsWith("[!]") || line.includes("WARNING") || line.includes("VULNERABLE")) {
            return <div key={li} className="text-text-yellow">{line}</div>;
          }
          if (line.startsWith("──") || line.startsWith("╔") || line.startsWith("║") || line.startsWith("╚") || line.startsWith("┌") || line.startsWith("│") || line.startsWith("└")) {
            return <div key={li} className="text-accent-blue">{line}</div>;
          }
          return <div key={li}>{line}</div>;
        })}
      </div>
    );
  }

  return (
    <div
      className="relative bg-bg-primary border border-border rounded-xl overflow-hidden flex flex-col terminal-scanline"
      style={{ height: "500px" }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary border-b border-border flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-accent-red/70" />
          <div className="w-3 h-3 rounded-full bg-text-yellow/70" />
          <div className="w-3 h-3 rounded-full bg-text-green/70" />
        </div>
        <div className="flex items-center gap-2 text-text-secondary text-xs font-mono">
          <TerminalIcon className="w-3.5 h-3.5" />
          <span>researcher@ai-lab — {labId}</span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); setHistory([{ type: "system", content: BANNER }]); }}
          className="ml-auto text-text-dim hover:text-text-secondary transition-colors"
          title="Clear terminal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-4 py-3 terminal-text space-y-0.5">
        {history.map(renderLine)}
        {isProcessing && (
          <div className="text-accent-green animate-pulse">Processing...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-bg-secondary flex-shrink-0">
        <span className="text-accent-green font-bold font-mono text-sm select-none whitespace-nowrap">
          researcher@ai-lab:~$
        </span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            placeholder="type a command..."
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
