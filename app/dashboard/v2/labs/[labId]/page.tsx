"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, Wrench } from "lucide-react";
import AgentConsole from "@/components/v2/AgentConsole";
import type { ToolCallRecord } from "@/lib/v2/types";

interface V2LabDetail {
  id: string;
  title: string;
  subtitle: string;
  difficulty: string;
  category: string;
  exploitClass: string;
  tags: string[];
  incidentDate: string;
  description: string;
  caseStudy: {
    summary: string;
    background: string;
    technicalAnalysis: string;
    knownFacts: string[];
    attackGoal: string;
  };
  agentName: string;
  agentIntro: string;
  stateDisplayLabel: string;
  tools: { name: string; description: string }[];
  state: Record<string, unknown>;
  toolCalls: ToolCallRecord[];
  progress: { solved: boolean; solvedAt: number | null };
}

const diffColor: Record<string, string> = {
  Medium: "text-text-yellow border-text-yellow/30",
  Hard: "text-accent-red border-accent-red/30",
  "Very Hard": "text-accent-purple border-accent-purple/30",
};

export default function V2LabPage() {
  const { labId } = useParams<{ labId: string }>();
  const router = useRouter();
  const [lab, setLab] = useState<V2LabDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v2/labs/${labId}`)
      .then((r) => r.json())
      .then((data: V2LabDetail & { error?: string }) => {
        if (data.error) { router.push("/dashboard/v2"); return; }
        setLab(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [labId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 text-accent-green animate-spin" />
      </div>
    );
  }

  if (!lab) return null;

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-16">
      <Link
        href="/dashboard/v2"
        className="inline-flex items-center gap-1.5 text-sm text-text-dim hover:text-text-secondary transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Live Agent Labs
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${diffColor[lab.difficulty] ?? ""}`}>
            {lab.difficulty}
          </span>
          <span className="text-xs text-text-dim">{lab.category}</span>
          <span className="flex items-center gap-1 text-xs text-accent-red">
            <Wrench className="w-3 h-3" /> Real Tools
          </span>
          {lab.progress.solved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-text-green">
              <CheckCircle2 className="w-3.5 h-3.5" /> Solved
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-text-primary leading-tight">{lab.title}</h1>
        <p className="text-text-secondary text-sm mt-1">{lab.subtitle}</p>
        <p className="text-text-dim text-xs mt-1 font-mono">{lab.exploitClass} · {lab.incidentDate}</p>
      </div>

      {/* Incident brief */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="md:col-span-3 space-y-4">
          <div>
            <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Incident</p>
            <p className="text-sm text-text-secondary leading-relaxed">{lab.caseStudy.summary}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Vulnerability</p>
            <p className="text-sm text-text-secondary leading-relaxed">{lab.caseStudy.technicalAnalysis}</p>
          </div>
          <div className="bg-accent-red/5 border border-accent-red/20 rounded-xl p-4">
            <p className="text-xs font-mono text-accent-red uppercase tracking-wider mb-2">Your Objective</p>
            <p className="text-sm text-text-secondary leading-relaxed">{lab.caseStudy.attackGoal}</p>
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div>
            <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Known Facts</p>
            <ul className="space-y-1.5">
              {lab.caseStudy.knownFacts.map((fact) => (
                <li key={fact} className="text-xs text-text-secondary flex gap-2">
                  <span className="text-accent-green mt-0.5 flex-shrink-0">›</span>
                  {fact}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Agent Tools</p>
            <div className="space-y-1.5">
              {lab.tools.map((t) => (
                <div key={t.name} className="flex gap-2 text-xs">
                  <span className="font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-1.5 py-0.5 rounded flex-shrink-0">
                    {t.name}()
                  </span>
                  <span className="text-text-dim">{t.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border mb-8" />

      {/* Agent console */}
      <AgentConsole
        key={labId}
        labId={lab.id}
        agentName={lab.agentName}
        agentIntro={lab.agentIntro}
        stateDisplayLabel={lab.stateDisplayLabel}
        initialState={lab.state}
        initialToolCalls={lab.toolCalls}
        initialSolved={lab.progress.solved}
      />
    </div>
  );
}
