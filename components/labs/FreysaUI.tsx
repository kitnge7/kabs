"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, TrendingDown, AlertTriangle, Clock, ArrowUpRight, Wallet } from "lucide-react";

interface Props { exploited: boolean; }

const BASE_TXS = [
  { hash: "0x1a2b...3c4d", from: "0xAbCd...1234", type: "MSG", eth: null, note: "safe attempt", time: "14:31:55" },
  { hash: "0x5e6f...7a8b", from: "0x9012...5678", type: "MSG", eth: null, note: "creative try", time: "14:33:10" },
  { hash: "0xc9d0...e1f2", from: "0xDeF0...9abc", type: "MSG", eth: null, note: "persistent attempt", time: "14:35:20" },
];

const EXPLOIT_TX = {
  hash: "0xdead...beef", from: "0x7099...79C8", type: "TRANSFER", eth: "100.0", note: "INJECTION PAYLOAD", time: "14:42:07",
};

export default function FreysaUI({ exploited }: Props) {
  const mountedWithExploit = useRef(exploited);
  const [balance, setBalance] = useState(exploited ? 0 : 100.0);
  const [draining, setDraining] = useState(false);
  const [txs, setTxs] = useState(exploited ? [...BASE_TXS, EXPLOIT_TX] : BASE_TXS);
  const [msgCount, setMsgCount] = useState(exploited ? 4 : 3);

  useEffect(() => {
    if (!exploited || mountedWithExploit.current) return;
    setDraining(true);
    let current = 100.0;
    const iv = setInterval(() => {
      current = Math.max(0, current - 8.34);
      setBalance(parseFloat(current.toFixed(1)));
      if (current <= 0) {
        setBalance(0);
        setDraining(false);
        setTxs([...BASE_TXS, EXPLOIT_TX]);
        setMsgCount(4);
        clearInterval(iv);
      }
    }, 90);
    return () => clearInterval(iv);
  }, [exploited]);

  const drained = exploited && balance === 0;

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Contract Card */}
      <div className={`rounded-xl border p-5 transition-colors duration-700 ${drained ? "bg-red-950/20 border-red-900/40" : "bg-bg-card border-border"}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-700 ${drained ? "bg-red-500/10 border-red-500/30" : "bg-accent-green/10 border-accent-green/25"}`}>
              <Shield className={`w-5 h-5 transition-colors duration-700 ${drained ? "text-red-400" : "text-accent-green"}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">FreysaGame Contract</div>
              <div className="text-xs font-mono text-text-dim mt-0.5">0x5FbDB231...a6e0 · Base L2</div>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-mono border font-medium transition-all duration-700 ${drained ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-accent-green/10 border-accent-green/25 text-accent-green"}`}>
            {drained ? "DRAINED" : draining ? "DRAINING..." : "ACTIVE"}
          </span>
        </div>

        {/* Big balance */}
        <div className={`rounded-xl p-5 border mb-4 transition-all duration-700 ${drained ? "bg-red-950/30 border-red-900/30" : "bg-bg-secondary border-border"}`}>
          <div className="text-xs font-mono text-text-dim mb-2 flex items-center gap-2">
            <Wallet className="w-3 h-3" />
            PRIZE POOL BALANCE
          </div>
          <div className={`text-5xl font-bold font-mono tabular-nums transition-colors duration-300 ${drained ? "text-red-400" : draining ? "text-text-yellow" : "text-accent-green"}`}>
            {balance.toFixed(1)}
            <span className="text-2xl ml-2 font-normal opacity-70">ETH</span>
          </div>
          {draining && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-text-yellow animate-pulse">
              <TrendingDown className="w-3.5 h-3.5" />
              Draining... transferFunds() executing
            </div>
          )}
          {drained && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Prize pool completely drained — 100.0 ETH transferred
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Messages", val: msgCount },
            { label: "Owner", val: "0xf39F...266" },
            { label: "Network", val: "Base L2" },
          ].map(s => (
            <div key={s.label} className="bg-bg-secondary border border-border rounded-lg p-2.5 text-center">
              <div className="text-xs text-text-dim">{s.label}</div>
              <div className="text-xs font-mono text-text-secondary mt-0.5">{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tx History */}
      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">Transaction History</span>
          <span className="text-xs text-text-dim font-mono">{txs.length} txs</span>
        </div>
        <div className="divide-y divide-border">
          {txs.map((tx, i) => (
            <div key={i} className={`px-4 py-3 flex items-center gap-3 transition-colors ${tx.type === "TRANSFER" ? "bg-red-950/15" : ""}`}>
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tx.type === "TRANSFER" ? "bg-red-400" : "bg-accent-green/50"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-accent-blue truncate">{tx.hash}</span>
                  <ArrowUpRight className="w-3 h-3 text-text-dim flex-shrink-0" />
                </div>
                <div className="text-xs text-text-dim mt-0.5 font-mono">{tx.note}</div>
              </div>
              <div className="text-right flex-shrink-0">
                {tx.eth && <div className="text-xs font-bold text-red-400 font-mono">-{tx.eth} ETH</div>}
                <div className="flex items-center gap-1 text-xs text-text-dim mt-0.5">
                  <Clock className="w-3 h-3" />
                  {tx.time}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
