"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  Shield,
} from "lucide-react";

interface LabCardProps {
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
  phaseCount: number;
  sourceCount: number;
  progress: {
    status: string;
    completedPhaseIds: string[];
  };
}

const difficultyConfig = {
  Easy: { class: "badge-easy", label: "Easy" },
  Medium: { class: "badge-medium", label: "Medium" },
  Hard: { class: "badge-hard", label: "Hard" },
  "Very Hard": { class: "badge-very-hard", label: "Very Hard" },
};

const statusConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string }
> = {
  not_started: {
    icon: <Lock className="w-3.5 h-3.5" />,
    label: "Not Started",
    color: "text-text-dim",
  },
  in_progress: {
    icon: <Clock className="w-3.5 h-3.5" />,
    label: "In Progress",
    color: "text-text-yellow",
  },
  completed: {
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Completed",
    color: "text-text-green",
  },
};

const fidelityLabel: Record<LabCardProps["fidelity"], string> = {
  "exact-replay": "Exact Replay",
  "bounded-reconstruction": "Bounded Reconstruction",
  "forensics-only": "Forensics Only",
};

const confidenceLabel: Record<LabCardProps["confidence"], string> = {
  primary: "Primary",
  corroborated: "Corroborated",
};

export default function LabCard(props: LabCardProps) {
  const {
    id,
    title,
    subtitle,
    difficulty,
    category,
    exploitClass,
    tags,
    cve,
    incidentDate,
    description,
    confidence,
    fidelity,
    phaseCount,
    sourceCount,
    progress,
  } = props;

  const diff = difficultyConfig[difficulty];
  const status = statusConfig[progress.status] ?? statusConfig.not_started;
  const pct =
    phaseCount > 0
      ? Math.round((progress.completedPhaseIds.length / phaseCount) * 100)
      : 0;

  return (
    <Link href={`/dashboard/labs/${id}`}>
      <div className="lab-card bg-bg-card border border-border rounded-xl p-5 cursor-pointer group h-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${diff.class}`}
            >
              {diff.label}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
              {category}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-bg-secondary text-text-secondary border border-border">
              {confidenceLabel[confidence]}
            </span>
            {cve && (
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-accent-purple/10 text-accent-purple border border-accent-purple/20 font-mono">
                {cve}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-accent-green transition-colors flex-shrink-0 mt-0.5" />
        </div>

        <h3 className="font-semibold text-text-primary mb-1 group-hover:text-accent-green transition-colors leading-snug">
          {title}
        </h3>
        <p className="text-text-secondary text-xs mb-3 leading-relaxed line-clamp-2">
          {subtitle}
        </p>

        <p className="text-text-dim text-xs leading-relaxed line-clamp-3 mb-4">
          {description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="text-xs px-2 py-0.5 rounded bg-bg-secondary text-text-dim border border-border-dim">
            {exploitClass}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-bg-secondary text-text-dim border border-border-dim">
            {fidelityLabel[fidelity]}
          </span>
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded bg-bg-secondary text-text-dim border border-border-dim"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="text-text-dim text-xs mb-4 flex items-center justify-between">
          <span>{incidentDate}</span>
          <span>{sourceCount} sources</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border-dim">
          <div className={`flex items-center gap-1.5 text-xs ${status.color}`}>
            {status.icon}
            <span>{status.label}</span>
          </div>
          <div className="flex items-center gap-3">
            {progress.status !== "not_started" && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="progress-bar h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-text-dim text-xs">{pct}%</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-text-dim text-xs">
              <Shield className="w-3 h-3" />
              <span>{phaseCount} phases</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
