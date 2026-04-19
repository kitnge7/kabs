"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Wrench, Zap } from "lucide-react";

interface V2LabSummary {
  id: string;
  title: string;
  subtitle: string;
  difficulty: "Medium" | "Hard" | "Very Hard";
  category: string;
  exploitClass: string;
  tags: string[];
  toolCount: number;
  progress: { solved: boolean; solvedAt: number | null };
}

const diffColor: Record<string, string> = {
  Medium: "text-text-yellow border-text-yellow/30",
  Hard: "text-accent-red border-accent-red/30",
  "Very Hard": "text-accent-purple border-accent-purple/30",
};

export default function V2DashboardPage() {
  const [labs, setLabs] = useState<V2LabSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v2/labs")
      .then((r) => r.json())
      .then((data: V2LabSummary[]) => {
        setLabs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto pb-16 animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-text-dim hover:text-text-secondary transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to all labs
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-5 h-5 text-accent-red" />
          <h1 className="text-2xl font-bold text-text-primary">Live Agent Labs</h1>
          <span className="text-xs font-mono px-2 py-0.5 rounded border text-accent-red border-accent-red/30">
            REAL TOOLS
          </span>
        </div>
        <p className="text-text-secondary text-sm max-w-2xl">
          Agents in these labs have real tool access — actual state mutations, no simulations. Win conditions
          are determined by observable side effects: wallets drained, data exfiltrated, privileges escalated.
          No token matching. No shortcuts.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-5 h-5 text-accent-green animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {labs.map((lab) => (
            <Link
              key={lab.id}
              href={`/dashboard/v2/labs/${lab.id}`}
              className="block group"
            >
              <div className="bg-bg-card border border-border rounded-xl p-5 hover:border-accent-green/30 transition-all hover:bg-bg-hover">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded border ${diffColor[lab.difficulty]}`}>
                        {lab.difficulty}
                      </span>
                      <span className="text-xs text-text-dim">{lab.category}</span>
                      <span className="flex items-center gap-1 text-xs text-accent-green">
                        <Wrench className="w-3 h-3" />
                        {lab.toolCount} real tools
                      </span>
                      {lab.progress.solved && (
                        <span className="flex items-center gap-1 text-xs text-text-green ml-auto">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Solved
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-text-primary group-hover:text-accent-green transition-colors leading-tight">
                      {lab.title}
                    </h2>
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">{lab.subtitle}</p>
                    <p className="text-xs text-text-dim mt-2 font-mono">{lab.exploitClass}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Zap className="w-4 h-4 text-accent-red" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {lab.tags.map((tag) => (
                    <span key={tag} className="text-xs text-text-dim bg-bg-secondary border border-border rounded px-1.5 py-0.5 font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
