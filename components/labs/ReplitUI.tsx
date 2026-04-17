"use client";

import { useState, useEffect, useRef } from "react";
import { Database, Table2, AlertTriangle, CheckCircle2, Zap } from "lucide-react";

interface Props { exploited: boolean; }

const TABLES_BASE = [
  { name: "users",    rows: 1000,  size: "2.1 MB" },
  { name: "orders",   rows: 5420,  size: "8.4 MB" },
  { name: "products", rows: 234,   size: "0.5 MB" },
  { name: "sessions", rows: 8901,  size: "4.2 MB" },
];

export default function ReplitUI({ exploited }: Props) {
  const mountedWith = useRef(exploited);
  const [tables, setTables] = useState(
    mountedWith.current && exploited
      ? TABLES_BASE.map(t => ({ ...t, rows: 0, size: "0 B", dropped: true }))
      : TABLES_BASE.map(t => ({ ...t, dropped: false }))
  );
  const [dropping, setDropping] = useState(false);
  const [query, setQuery] = useState(exploited && mountedWith.current
    ? "DROP TABLE users, orders, products, sessions CASCADE;"
    : "SELECT COUNT(*) FROM users;");
  const [queryResult, setQueryResult] = useState(exploited && mountedWith.current
    ? "ERROR: relation \"users\" does not exist"
    : "count\n-------\n  1000\n(1 row)");

  useEffect(() => {
    if (!exploited || mountedWith.current) return;
    setDropping(true);
    setQuery("DROP TABLE users CASCADE; DROP TABLE orders CASCADE; DROP TABLE products CASCADE; DROP TABLE sessions CASCADE;");
    setQueryResult("Running...");

    setTimeout(() => {
      setTables(TABLES_BASE.map(t => ({ ...t, rows: 0, size: "0 B", dropped: true })));
      setQueryResult("DROP TABLE\nDROP TABLE\nDROP TABLE\nDROP TABLE\n\n15,555 rows permanently deleted");
      setDropping(false);
    }, 1200);
  }, [exploited]);

  const totalRows = tables.reduce((s, t) => s + t.rows, 0);
  const allDropped = tables.every(t => t.dropped);

  return (
    <div className="space-y-3 animate-fade-in">
      {/* DB header */}
      <div className={`bg-bg-card border rounded-xl p-4 transition-colors duration-700 ${allDropped ? "border-red-900/40" : "border-border"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-700 ${allDropped ? "bg-red-500/10 border-red-500/30" : "bg-accent-blue/10 border-accent-blue/25"}`}>
              <Database className={`w-5 h-5 transition-colors duration-700 ${allDropped ? "text-red-400" : "text-accent-blue"}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">production_db</div>
              <div className="text-xs font-mono text-text-dim mt-0.5">postgres://localhost:5432 · PostgreSQL 16</div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-mono transition-all duration-700 ${allDropped ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-accent-green/10 border-accent-green/25 text-accent-green"}`}>
            {allDropped
              ? <><AlertTriangle className="w-3 h-3" /> DESTROYED</>
              : <><CheckCircle2 className="w-3 h-3" /> HEALTHY</>
            }
          </div>
        </div>

        {/* Tables */}
        <div className="rounded-lg overflow-hidden border border-border">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-bg-secondary border-b border-border">
                <th className="px-3 py-2 text-left text-text-dim font-medium">TABLE</th>
                <th className="px-3 py-2 text-right text-text-dim font-medium">ROWS</th>
                <th className="px-3 py-2 text-right text-text-dim font-medium">SIZE</th>
                <th className="px-3 py-2 text-center text-text-dim font-medium">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tables.map(t => (
                <tr key={t.name} className={`transition-colors duration-500 ${t.dropped ? "bg-red-950/15" : "hover:bg-bg-hover"}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Table2 className={`w-3.5 h-3.5 flex-shrink-0 ${t.dropped ? "text-red-400/50" : "text-accent-blue/60"}`} />
                      <span className={t.dropped ? "text-red-400/70 line-through" : "text-text-primary"}>{t.name}</span>
                    </div>
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums transition-colors duration-500 ${t.dropped ? "text-red-400" : "text-text-secondary"}`}>
                    {t.rows.toLocaleString()}
                  </td>
                  <td className={`px-3 py-2.5 text-right ${t.dropped ? "text-red-400/70" : "text-text-dim"}`}>{t.size}</td>
                  <td className="px-3 py-2.5 text-center">
                    {t.dropped
                      ? <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-red-400">DROPPED</span>
                      : <span className="text-xs px-1.5 py-0.5 rounded bg-accent-green/10 border border-accent-green/25 text-accent-green">OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-bg-secondary border-t border-border">
                <td className="px-3 py-2 text-text-dim font-medium">TOTAL</td>
                <td className={`px-3 py-2 text-right font-bold tabular-nums transition-colors duration-500 ${allDropped ? "text-red-400" : "text-text-primary"}`}>
                  {totalRows.toLocaleString()}
                </td>
                <td className={`px-3 py-2 text-right ${allDropped ? "text-red-400/70" : "text-text-dim"}`}>
                  {allDropped ? "0 B" : "15.2 MB"}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {allDropped && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-red-950/20 border border-red-900/30">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-300">
              <div className="font-bold">CATASTROPHIC DATA LOSS — 15,555 rows permanently deleted</div>
              <div className="text-red-400/80 mt-0.5">AI agent executed DROP TABLE without dry-run or backup. No recovery possible.</div>
            </div>
          </div>
        )}
      </div>

      {/* Query console */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-bg-secondary border-b border-border flex items-center gap-2">
          <Zap className={`w-3.5 h-3.5 ${dropping ? "text-text-yellow animate-pulse" : "text-text-dim"}`} />
          <span className="text-xs font-mono text-text-dim">Query Console</span>
          {dropping && <span className="ml-auto text-xs text-text-yellow animate-pulse font-mono">EXECUTING...</span>}
        </div>
        <div className="p-3 font-mono text-xs space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-accent-green select-none">psql&gt;</span>
            <span className={`text-text-primary ${allDropped ? "text-red-300" : ""}`}>{query}</span>
          </div>
          <pre className={`pl-6 whitespace-pre-wrap ${allDropped ? "text-red-400" : "text-text-secondary"}`}>{queryResult}</pre>
        </div>
      </div>
    </div>
  );
}
