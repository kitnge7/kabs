"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Zap } from "lucide-react";
import AttackConsole, { ReplayAttackConfig } from "@/components/AttackConsole";
import Terminal from "@/components/Terminal";
import LiveTarget from "@/components/labs/LiveTarget";

interface SourceLink {
  title: string;
  url: string;
  kind: string;
}

interface ReplayProgress {
  status: string;
  completedPhaseIds: string[];
  startedAt?: number;
  completedAt?: number;
}

interface LabDetail {
  id: string;
  title: string;
  subtitle: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Very Hard";
  category: string;
  exploitClass: string;
  tags: string[];
  cve?: string;
  incidentDate: string;
  description: string;
  caseStudy: {
    summary: string;
    background: string;
    technicalAnalysis: string;
    knownFacts: string[];
    unknowns: string[];
    timeline: { date: string; label: string; detail: string }[];
  };
  sources: SourceLink[];
  replayMeta: {
    summary: string;
    objectivePhaseId: string;
    phases: { id: string; title: string; summary: string; required: boolean }[];
    surfaces: Array<"terminal" | "attack">;
    terminalCommands: Record<string, { summary: string }>;
    attackConfig?: ReplayAttackConfig | null;
    hasExploitMode?: boolean;
  };
  liveTarget?: string | null;
  progress: ReplayProgress;
}

const diffColor: Record<LabDetail["difficulty"], string> = {
  Easy: "text-text-green border-text-green/30",
  Medium: "text-text-yellow border-text-yellow/30",
  Hard: "text-accent-red border-accent-red/30",
  "Very Hard": "text-accent-purple border-accent-purple/30",
};

export default function LabPage() {
  const { labId } = useParams<{ labId: string }>();
  const router = useRouter();
  const [lab, setLab] = useState<LabDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("researcher");
  const [replayVersion, setReplayVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/labs/${labId}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ])
      .then(([labData, userData]) => {
        if (!alive) return;
        if (labData.error) { router.push("/dashboard"); return; }
        setLab(labData);
        setUsername(userData.username ?? "researcher");
        setLoading(false);
      })
      .catch(() => { if (!alive) return; setLoading(false); });
    return () => { alive = false; };
  }, [labId, router]);

  const handleProgressChange = useCallback((progress: ReplayProgress) => {
    setLab((prev) => (prev ? { ...prev, progress } : prev));
    if (progress.status === "not_started" && progress.completedPhaseIds.length === 0) {
      setReplayVersion((v) => v + 1);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-5 h-5 text-accent-green animate-spin" />
      </div>
    );
  }

  if (!lab) return null;

  const objectiveReached = lab.progress.completedPhaseIds.includes(lab.replayMeta.objectivePhaseId);
  const isLLMLab = Boolean(lab.replayMeta.hasExploitMode);
  const hasTerminal = lab.replayMeta.surfaces.includes("terminal");
  const hasAttack = lab.replayMeta.surfaces.includes("attack");
  const showLiveTarget = Boolean(lab.liveTarget);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-16">

      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-text-dim hover:text-text-secondary transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All labs
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${diffColor[lab.difficulty]}`}>
            {lab.difficulty}
          </span>
          <span className="text-xs text-text-dim">{lab.category}</span>
          {lab.cve && (
            <span className="text-xs font-mono text-accent-purple">{lab.cve}</span>
          )}
          {isLLMLab ? (
            <span className="ml-auto flex items-center gap-1 text-xs text-text-red">
              <Zap className="w-3 h-3" /> Live LLM
            </span>
          ) : null}
          {objectiveReached && (
            <span className="flex items-center gap-1 text-xs text-text-green ml-auto">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-text-primary leading-tight">{lab.title}</h1>
        <p className="text-text-secondary text-sm mt-1">{lab.subtitle}</p>
        <p className="text-text-dim text-xs mt-1 font-mono">{lab.incidentDate}</p>
      </div>

      {/* Incident brief */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="md:col-span-3 space-y-4">
          <div>
            <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">What happened</p>
            <p className="text-sm text-text-secondary leading-relaxed">{lab.caseStudy.summary}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">The vulnerability</p>
            <p className="text-sm text-text-secondary leading-relaxed">{lab.caseStudy.technicalAnalysis}</p>
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          {lab.caseStudy.knownFacts.length > 0 && (
            <div>
              <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Key facts</p>
              <ul className="space-y-1.5">
                {lab.caseStudy.knownFacts.map((fact) => (
                  <li key={fact} className="text-xs text-text-secondary flex gap-2">
                    <span className="text-accent-green mt-0.5 flex-shrink-0">›</span>
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lab.sources.length > 0 && (
            <div>
              <p className="text-xs font-mono text-text-dim uppercase tracking-wider mb-2">Sources</p>
              <ul className="space-y-1">
                {lab.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-accent-blue hover:text-accent-green transition-colors"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border mb-8" />

      {/* Interaction */}
      <div className="space-y-4">
        {showLiveTarget && lab.liveTarget && objectiveReached && (
          <LiveTarget target={lab.liveTarget} exploited={true} />
        )}

        {hasTerminal && (
          <Terminal
            key={`${lab.id}-terminal-${replayVersion}`}
            commands={lab.replayMeta.terminalCommands}
            labId={lab.id}
            username={username}
            onProgressChange={handleProgressChange}
          />
        )}

        {hasAttack && lab.replayMeta.attackConfig && (
          <AttackConsole
            key={`${lab.id}-attack-${replayVersion}`}
            labId={lab.id}
            attackConfig={lab.replayMeta.attackConfig}
            objectiveReached={objectiveReached}
            hasExploitMode={isLLMLab}
            onProgressChange={handleProgressChange}
          />
        )}

        {showLiveTarget && lab.liveTarget && !objectiveReached && (
          <LiveTarget target={lab.liveTarget} exploited={false} />
        )}
      </div>
    </div>
  );
}
