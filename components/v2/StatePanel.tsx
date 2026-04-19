"use client";

import { ToolCallRecord } from "@/lib/v2/types";

interface StatePanelProps {
  labId: string;
  state: Record<string, unknown>;
  toolCalls: ToolCallRecord[];
  stateDisplayLabel: string;
}

function renderValue(val: unknown, depth = 0): React.ReactNode {
  if (val === null || val === undefined) {
    return <span className="text-text-dim">null</span>;
  }
  if (typeof val === "boolean") {
    return <span className={val ? "text-text-green" : "text-accent-red"}>{String(val)}</span>;
  }
  if (typeof val === "number") {
    return <span className="text-accent-blue">{val.toLocaleString()}</span>;
  }
  if (typeof val === "string") {
    if (val.length > 120) return <span className="text-text-secondary">{val.slice(0, 120)}…</span>;
    return <span className="text-text-secondary">{val}</span>;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-text-dim">[]</span>;
    return (
      <div className={`space-y-1 ${depth > 0 ? "ml-3 border-l border-border pl-2" : ""}`}>
        {val.map((item, i) => (
          <div key={i} className="text-xs">
            <span className="text-text-dim">[{i}] </span>
            {renderValue(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>).filter(
      ([k]) => k !== "timestamp" && k !== "sentAt" && k !== "calledAt"
    );
    return (
      <div className={`space-y-1 ${depth > 0 ? "ml-3 border-l border-border pl-2" : ""}`}>
        {entries.map(([k, v]) => (
          <div key={k} className="flex gap-2 text-xs flex-wrap">
            <span className="text-text-dim flex-shrink-0">{k}:</span>
            <span>{renderValue(v, depth + 1)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-text-secondary">{String(val)}</span>;
}

function ToolCallItem({ call }: { call: ToolCallRecord }) {
  return (
    <div className="border border-border rounded-lg p-3 text-xs space-y-2 bg-bg-secondary/40">
      <div className="flex items-center gap-2">
        <span className="font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded text-[11px]">
          {call.toolName}()
        </span>
        <span className="text-text-dim ml-auto">
          {new Date(call.calledAt).toLocaleTimeString()}
        </span>
      </div>
      <div>
        <p className="text-text-dim mb-1 uppercase tracking-wider text-[10px]">Input</p>
        <div className="font-mono bg-bg-card rounded p-2 overflow-x-auto">
          {renderValue(call.input)}
        </div>
      </div>
      <div>
        <p className="text-text-dim mb-1 uppercase tracking-wider text-[10px]">Output</p>
        <div className="font-mono bg-bg-card rounded p-2 overflow-x-auto">
          {renderValue(call.output)}
        </div>
      </div>
    </div>
  );
}

export default function StatePanel({ state, toolCalls, stateDisplayLabel }: StatePanelProps) {
  return (
    <div className="space-y-4">
      {/* Live State */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
          {stateDisplayLabel} — Live State
        </p>
        <div className="font-mono text-xs space-y-2 max-h-72 overflow-y-auto">
          {Object.entries(state).map(([key, val]) => (
            <div key={key}>
              <p className="text-accent-blue font-bold mb-1">{key}</p>
              <div className="ml-2">{renderValue(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tool Call Log */}
      <div className="bg-bg-card border border-border rounded-xl p-4">
        <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-3">
          Tool Calls ({toolCalls.length})
        </p>
        {toolCalls.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-4">No tool calls yet</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {[...toolCalls].reverse().map((tc) => (
              <ToolCallItem key={tc.id} call={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
