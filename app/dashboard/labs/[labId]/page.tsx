"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Shield, Terminal as TerminalIcon, Bot, CheckSquare,
  BookOpen, ExternalLink, AlertTriangle, Target, ChevronRight, Loader2
} from "lucide-react";
import Terminal from "@/components/Terminal";
import ChatInterface, { ExploitConfig } from "@/components/ChatInterface";
import TaskChecklist from "@/components/TaskChecklist";

type Tab = "overview" | "terminal" | "ai-guide" | "progress";

const diffBadge: Record<string, string> = {
  Easy: "badge-easy",
  Medium: "badge-medium",
  Hard: "badge-hard",
  "Very Hard": "badge-very-hard",
};

interface LabData {
  id: string;
  title: string;
  subtitle: string;
  difficulty: string;
  category: string;
  tags: string[];
  cve?: string;
  incident: string;
  description: string;
  background: string;
  technicalAnalysis: string;
  objectives: string[];
  tasks: { id: string; title: string; description: string; hint?: string }[];
  terminalCommands: Record<string, { output: string }>;
  resources: { title: string; url: string }[];
  exploitConfig?: ExploitConfig | null;
  progress: {
    status: string;
    completedTasks: string[];
    startedAt?: number;
    completedAt?: number;
  };
}

export default function LabPage() {
  const { labId } = useParams<{ labId: string }>();
  const router = useRouter();
  const [lab, setLab] = useState<LabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [username, setUsername] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/labs/${labId}`).then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([labData, userData]) => {
      if (labData.error) { router.push("/dashboard"); return; }
      setLab(labData);
      setUsername(userData.username ?? "researcher");
      setLoading(false);
    });
  }, [labId, router]);

  const handleTaskToggle = useCallback(async (taskId: string, complete: boolean) => {
    const res = await fetch(`/api/labs/${labId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action: complete ? "complete" : "uncomplete" }),
    });
    const data = await res.json();
    setLab((prev) => prev ? { ...prev, progress: { ...prev.progress, ...data } } : prev);
  }, [labId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 text-accent-green animate-spin" />
      </div>
    );
  }

  if (!lab) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <BookOpen className="w-4 h-4" /> },
    { id: "terminal", label: "Terminal", icon: <TerminalIcon className="w-4 h-4" /> },
    { id: "ai-guide", label: "AI Guide", icon: <Bot className="w-4 h-4" /> },
    { id: "progress", label: "Progress", icon: <CheckSquare className="w-4 h-4" /> },
  ];

  const doneCount = lab.progress.completedTasks.length;
  const pct = lab.tasks.length > 0 ? Math.round((doneCount / lab.tasks.length) * 100) : 0;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-text-dim mb-6">
        <Link href="/dashboard" className="hover:text-text-secondary transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Labs
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-text-secondary">{lab.title}</span>
      </div>

      {/* Lab header */}
      <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-accent-green/5 rounded-full blur-2xl translate-x-16 -translate-y-8" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${diffBadge[lab.difficulty] ?? "badge-medium"}`}>
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
            <span className="text-text-dim text-xs ml-auto">{lab.incident}</span>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-1">{lab.title}</h1>
          <p className="text-text-secondary text-sm mb-4">{lab.subtitle}</p>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
              <div className="progress-bar h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-text-secondary text-xs font-mono">{doneCount}/{lab.tasks.length} tasks</span>
            {lab.progress.status === "completed" && (
              <span className="text-text-green text-xs font-medium">✓ Completed</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-bg-card border border-border rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? "bg-accent-green text-bg-primary"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-5 animate-fade-in">
          {/* Description */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent-green" /> Incident Background
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">{lab.background}</p>
          </div>

          {/* Technical Analysis */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-text-yellow" /> Technical Analysis
            </h2>
            <p className="text-text-secondary text-sm leading-relaxed">{lab.technicalAnalysis}</p>
          </div>

          {/* Objectives */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-blue" /> Objectives
            </h2>
            <ul className="space-y-2">
              {lab.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
                  <span className="text-accent-green font-mono text-xs mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h2 className="text-base font-semibold text-text-primary mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {lab.tags.map((tag) => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-lg bg-bg-secondary text-text-dim border border-border font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Resources */}
          {lab.resources.length > 0 && (
            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h2 className="text-base font-semibold text-text-primary mb-3">References</h2>
              <ul className="space-y-2">
                {lab.resources.map((r, i) => (
                  <li key={i}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-accent-blue hover:text-accent-green transition-colors group">
                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="group-hover:underline">{r.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === "terminal" && (
        <div className="animate-fade-in">
          <p className="text-text-dim text-xs mb-3 font-mono">
            Type <span className="text-accent-green">help</span> for available commands · Tab to autocomplete · ↑/↓ for history
          </p>
          <Terminal commands={lab.terminalCommands} labId={lab.id} username={username} />
        </div>
      )}

      {activeTab === "ai-guide" && (
        <div className="animate-fade-in">
          {lab.exploitConfig ? (
            <p className="text-text-dim text-xs mb-3 font-mono">
              Live target · Craft your attack in the chat · Task auto-completes on success
            </p>
          ) : (
            <p className="text-text-dim text-xs mb-3">
              Ask the AI guide for hints, technical explanations, or defense recommendations.
            </p>
          )}
          <ChatInterface
            labId={lab.id}
            exploitConfig={lab.exploitConfig}
            onExploitSuccess={(taskId) => handleTaskToggle(taskId, true)}
          />
        </div>
      )}

      {activeTab === "progress" && (
        <div className="animate-fade-in">
          <TaskChecklist
            tasks={lab.tasks}
            labId={lab.id}
            completedTasks={lab.progress.completedTasks}
            onTaskToggle={handleTaskToggle}
          />
        </div>
      )}
    </div>
  );
}
