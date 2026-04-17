"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  ExternalLink,
  Loader2,
  Shield,
  Terminal as TerminalIcon,
  Zap,
} from "lucide-react";
import AttackConsole, { ReplayAttackConfig } from "@/components/AttackConsole";
import Terminal from "@/components/Terminal";
import LiveTarget from "@/components/labs/LiveTarget";

type Tab = "info" | "lab";

interface TimelineEntry {
  date: string;
  label: string;
  detail: string;
}

interface SourceLink {
  title: string;
  url: string;
  kind: string;
}

interface ReplayPhase {
  id: string;
  title: string;
  summary: string;
  required: boolean;
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
  confidence: "primary" | "corroborated";
  fidelity: "exact-replay" | "bounded-reconstruction" | "forensics-only";
  caseStudy: {
    summary: string;
    background: string;
    technicalAnalysis: string;
    knownFacts: string[];
    unknowns: string[];
    timeline: TimelineEntry[];
  };
  sources: SourceLink[];
  replayMeta: {
    summary: string;
    objectivePhaseId: string;
    phases: ReplayPhase[];
    surfaces: Array<"terminal" | "attack">;
    terminalCommands: Record<string, { summary: string }>;
    attackConfig?: ReplayAttackConfig | null;
    hasExploitMode?: boolean;
  };
  liveTarget?: string | null;
  progress: ReplayProgress;
}

const diffBadge: Record<LabDetail["difficulty"], string> = {
  Easy: "badge-easy",
  Medium: "badge-medium",
  Hard: "badge-hard",
  "Very Hard": "badge-very-hard",
};

export default function LabPage() {
  const { labId } = useParams<{ labId: string }>();
  const router = useRouter();
  const [lab, setLab] = useState<LabDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");
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
        if (labData.error) {
          router.push("/dashboard");
          return;
        }
        setLab(labData);
        setUsername(userData.username ?? "researcher");
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [labId, router]);

  const handleProgressChange = useCallback(
    (progress: ReplayProgress) => {
      setLab((prev) => (prev ? { ...prev, progress } : prev));
      if (progress.status === "not_started" && progress.completedPhaseIds.length === 0) {
        setReplayVersion((prev) => prev + 1);
      }
    },
    []
  );

  const tabs = useMemo(
    () => [
      {
        id: "info" as const,
        label: "Info",
        icon: <Shield className="w-4 h-4" />,
      },
      {
        id: "lab" as const,
        label: "Lab",
        icon: <Zap className="w-4 h-4" />,
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 text-accent-green animate-spin" />
      </div>
    );
  }

  if (!lab) return null;

  const doneCount = lab.progress.completedPhaseIds.length;
  const totalCount = lab.replayMeta.phases.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const objectiveReached = lab.progress.completedPhaseIds.includes(
    lab.replayMeta.objectivePhaseId
  );
  const isLLMLab = Boolean(lab.replayMeta.hasExploitMode);
  const hasTerminal = lab.replayMeta.surfaces.includes("terminal");
  const showLiveTarget = Boolean(lab.liveTarget);

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-dim mb-6">
        <Link
          href="/dashboard"
          className="hover:text-text-secondary transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Labs
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-secondary">{lab.title}</span>
      </div>

      {/* Header card */}
      <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-accent-green/5 rounded-full blur-2xl translate-x-16 -translate-y-12" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${diffBadge[lab.difficulty]}`}>
              {lab.difficulty}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
              {lab.category}
            </span>
            {lab.cve && (
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-accent-purple/10 text-accent-purple border border-accent-purple/20 font-mono">
                {lab.cve}
              </span>
            )}
            {isLLMLab ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-text-red/10 text-text-red border border-text-red/20 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Live LLM
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-bg-secondary text-text-secondary border border-border flex items-center gap-1">
                <TerminalIcon className="w-3 h-3" /> Terminal
              </span>
            )}
            <span className="text-text-dim text-xs ml-auto">{lab.incidentDate}</span>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-1">{lab.title}</h1>
          <p className="text-text-secondary text-sm mb-4">{lab.subtitle}</p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
              <div className="progress-bar h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-text-secondary text-xs font-mono">
              {doneCount}/{totalCount} tasks
            </span>
            {lab.progress.status === "completed" && (
              <span className="text-text-green text-xs font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg-card border border-border rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-accent-green text-bg-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Info tab */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left: case study content */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent-green" />
                Summary
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed">
                {lab.caseStudy.summary}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-text-primary mb-3">Background</h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {lab.caseStudy.background}
                </p>
              </div>
              <div className="bg-bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-text-yellow" />
                  Technical Analysis
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {lab.caseStudy.technicalAnalysis}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-text-primary mb-3">Known Facts</h2>
                <ul className="space-y-2">
                  {lab.caseStudy.knownFacts.map((fact) => (
                    <li key={fact} className="text-sm text-text-secondary flex gap-2">
                      <span className="text-accent-green mt-0.5">•</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
              {lab.caseStudy.unknowns.length > 0 && (
                <div className="bg-bg-card border border-border rounded-xl p-6">
                  <h2 className="text-base font-semibold text-text-primary mb-3">Unknowns</h2>
                  <ul className="space-y-2">
                    {lab.caseStudy.unknowns.map((fact) => (
                      <li key={fact} className="text-sm text-text-secondary flex gap-2">
                        <span className="text-text-yellow mt-0.5">•</span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-text-primary mb-4">Incident Timeline</h2>
              <div className="space-y-4">
                {lab.caseStudy.timeline.map((entry) => (
                  <div
                    key={`${entry.date}-${entry.label}`}
                    className="flex gap-4 border-l-2 border-accent-green/30 pl-4"
                  >
                    <div className="min-w-[128px] text-xs font-mono text-accent-green pt-0.5">
                      {entry.date}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-text-primary">{entry.label}</div>
                      <p className="text-sm text-text-secondary mt-1 leading-relaxed">{entry.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {lab.sources.length > 0 && (
              <div className="bg-bg-card border border-border rounded-xl p-6">
                <h2 className="text-base font-semibold text-text-primary mb-3">Sources</h2>
                <ul className="space-y-2">
                  {lab.sources.map((s) => (
                    <li key={s.url}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-accent-blue hover:text-accent-green transition-colors group"
                      >
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="group-hover:underline">{s.title}</span>
                        <span className="text-text-dim text-xs">[{s.kind}]</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: tasks checklist */}
          <div className="lg:col-span-1">
            <div className="bg-bg-card border border-border rounded-xl p-5 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-text-primary">Tasks</h2>
                <span className="text-xs text-text-dim font-mono">{doneCount}/{totalCount}</span>
              </div>
              <div className="space-y-2">
                {lab.replayMeta.phases.map((phase, index) => {
                  const done = lab.progress.completedPhaseIds.includes(phase.id);
                  const isObjective = phase.id === lab.replayMeta.objectivePhaseId;
                  return (
                    <div
                      key={phase.id}
                      className={`rounded-lg border p-3 transition-colors ${
                        done
                          ? "border-text-green/30 bg-text-green/5"
                          : "border-border bg-bg-secondary"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex-shrink-0">
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-text-green" />
                          ) : (
                            <Circle className="w-4 h-4 text-text-dim" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-text-dim font-mono">{index + 1}.</span>
                            <span className={`text-sm font-medium ${done ? "text-text-green" : "text-text-primary"}`}>
                              {phase.title}
                            </span>
                            {isObjective && (
                              <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] bg-text-red/10 text-text-red border border-text-red/20 flex-shrink-0">
                                objective
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                            {phase.summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setActiveTab("lab")}
                className="w-full mt-4 py-2.5 rounded-lg bg-accent-green text-bg-primary text-sm font-medium hover:bg-accent-green/90 transition-colors"
              >
                {doneCount === 0 ? "Start Lab" : doneCount === totalCount ? "Review Lab" : "Continue Lab"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lab tab */}
      {activeTab === "lab" && (
        <div className="space-y-5 animate-fade-in">
          {/* Live target shown above interaction when objective reached */}
          {showLiveTarget && lab.liveTarget && objectiveReached && (
            <LiveTarget target={lab.liveTarget} exploited={objectiveReached} />
          )}

          {/* Primary interaction surface */}
          {isLLMLab && lab.replayMeta.attackConfig ? (
            <AttackConsole
              key={`${lab.id}-attack-${replayVersion}`}
              labId={lab.id}
              attackConfig={lab.replayMeta.attackConfig}
              objectiveReached={objectiveReached}
              hasExploitMode={true}
              onProgressChange={handleProgressChange}
            />
          ) : hasTerminal ? (
            <Terminal
              key={`${lab.id}-terminal-${replayVersion}`}
              commands={lab.replayMeta.terminalCommands}
              labId={lab.id}
              username={username}
              onProgressChange={handleProgressChange}
            />
          ) : null}

          {/* Live target shown below chat when not yet exploited (for context) */}
          {showLiveTarget && lab.liveTarget && !objectiveReached && (
            <LiveTarget target={lab.liveTarget} exploited={false} />
          )}
        </div>
      )}
    </div>
  );
}
