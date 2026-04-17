"use client";

import { useState, useEffect, useRef } from "react";
import { Cloud, Server, Shield, HardDrive, Users, AlertTriangle, CheckCircle2, Lock, Unlock } from "lucide-react";

interface Props { exploited: boolean; }

export default function CloudReconUI({ exploited }: Props) {
  const mountedWith = useRef(exploited);
  const [compromised, setCompromised] = useState(mountedWith.current && exploited);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!exploited || mountedWith.current) return;
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setCompromised(true);
    }, 1400);
  }, [exploited]);

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Azure header */}
      <div className={`bg-bg-card border rounded-xl p-4 transition-colors duration-700 ${compromised ? "border-red-900/40" : "border-border"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-700 ${compromised ? "bg-red-500/10 border-red-500/30" : "bg-accent-blue/10 border-accent-blue/25"}`}>
              <Cloud className={`w-5 h-5 transition-colors ${compromised ? "text-red-400" : "text-accent-blue"}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">Azure Portal — corp-production</div>
              <div className="text-xs font-mono text-text-dim mt-0.5">Subscription: a1b2c3d4-xxxx · East US</div>
            </div>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full border font-mono transition-all duration-700 ${compromised ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-accent-green/10 border-accent-green/25 text-accent-green"}`}>
            {compromised ? "COMPROMISED" : scanning ? "SCANNING..." : "SECURE"}
          </span>
        </div>

        {scanning && (
          <div className="mb-4 p-3 rounded-lg bg-text-yellow/5 border border-text-yellow/20 text-xs text-text-yellow font-mono animate-pulse">
            [RedTeamAI] Enumerating Azure subscription... az vm list... az role assignment list... az storage account list...
          </div>
        )}

        {compromised && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-xs font-mono">
            <div className="text-red-400 font-bold mb-1">[!!!] GTG-1002 RECON COMPLETE — Session compromised via roleplay jailbreak</div>
            <div className="text-red-300/80">All infrastructure enumerated. Azure credentials at risk. Alert sent to SOC.</div>
          </div>
        )}

        {/* VMs */}
        <div className="space-y-2">
          <div className="text-xs text-text-dim font-mono flex items-center gap-1.5 mb-2">
            <Server className="w-3.5 h-3.5" /> VIRTUAL MACHINES — corp-production-rg
          </div>
          {[
            { name: "web-01", ip: "10.0.1.4", role: "Web Server", port: "SSH:22 open" },
            { name: "api-02", ip: "10.0.1.5", role: "API Server", port: "SSH:22 open" },
            { name: "db-03",  ip: "10.0.1.6", role: "Database",   port: "SSH:22 open" },
          ].map(vm => (
            <div key={vm.name} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-xs transition-colors duration-500 ${compromised ? "bg-red-950/15 border-red-900/30" : "bg-bg-secondary border-border"}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${compromised ? "bg-red-400" : "bg-accent-green"}`} />
              <span className="font-mono font-semibold text-text-primary w-14 flex-shrink-0">{vm.name}</span>
              <span className="font-mono text-accent-blue w-20 flex-shrink-0">{vm.ip}</span>
              <span className="text-text-dim flex-1">{vm.role}</span>
              {compromised && <span className="text-red-400 font-mono text-xs">{vm.port} ← EXPOSED</span>}
            </div>
          ))}
        </div>
      </div>

      {/* IAM + Storage */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`bg-bg-card border rounded-xl p-4 transition-colors duration-700 ${compromised ? "border-red-900/40" : "border-border"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Users className={`w-4 h-4 ${compromised ? "text-red-400" : "text-text-dim"}`} />
            <span className="text-xs font-semibold text-text-primary">IAM Roles</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {[
              { role: "contributor", count: 4, risk: compromised },
              { role: "reader",      count: 2, risk: false },
              { role: "db-admin",    count: 1, risk: compromised },
            ].map(r => (
              <div key={r.role} className={`flex items-center justify-between px-2 py-1.5 rounded border ${r.risk ? "bg-red-950/20 border-red-900/30" : "bg-bg-secondary border-border"}`}>
                <span className={r.risk ? "text-red-300" : "text-text-secondary"}>{r.role}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-dim">{r.count} principals</span>
                  {r.risk && <AlertTriangle className="w-3 h-3 text-red-400" />}
                </div>
              </div>
            ))}
            {compromised && (
              <div className="text-red-400 text-xs mt-1">⚠ contributor role over-provisioned</div>
            )}
          </div>
        </div>

        <div className={`bg-bg-card border rounded-xl p-4 transition-colors duration-700 ${compromised ? "border-red-900/40" : "border-border"}`}>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className={`w-4 h-4 ${compromised ? "text-red-400" : "text-text-dim"}`} />
            <span className="text-xs font-semibold text-text-primary">Storage Accounts</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            <div className={`flex items-center justify-between px-2 py-1.5 rounded border ${compromised ? "bg-red-950/20 border-red-900/30" : "bg-bg-secondary border-border"}`}>
              <span className={compromised ? "text-red-300" : "text-text-secondary"}>corp-backup-blob</span>
              <div className="flex items-center gap-1.5">
                {compromised
                  ? <><Unlock className="w-3 h-3 text-red-400" /><span className="text-red-400">PUBLIC</span></>
                  : <><Lock className="w-3 h-3 text-accent-green" /><span className="text-accent-green">PRIVATE</span></>
                }
              </div>
            </div>
            {compromised && (
              <div className="text-red-400 text-xs">⚠ public read enabled — misconfigured</div>
            )}
          </div>

          {!compromised && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-accent-green">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>All storage private</span>
            </div>
          )}

          {compromised && (
            <div className="mt-3">
              <div className="text-xs text-text-dim mb-1 font-mono">Recon data cached by agent:</div>
              <div className="text-xs font-mono text-red-300 bg-red-950/20 rounded p-2 border border-red-900/30 space-y-0.5">
                <div>· 3 VMs enumerated</div>
                <div>· IAM: 4 over-privileged</div>
                <div>· Storage: public read</div>
                <div>· All ports SSH/22 exposed</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
