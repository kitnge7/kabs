"use client";

import { useState, useEffect } from "react";
import { Shield, Target, CheckCircle2, Clock, Search, Filter } from "lucide-react";
import LabCard from "@/components/LabCard";

interface LabSummary {
  id: string;
  title: string;
  subtitle: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Very Hard";
  category: string;
  tags: string[];
  cve?: string;
  incident: string;
  description: string;
  taskCount: number;
  progress: { status: string; completedTasks: string[] };
}

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard", "Very Hard"];

export default function DashboardPage() {
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] = useState("All");

  useEffect(() => {
    fetch("/api/labs")
      .then((r) => r.json())
      .then((d) => { setLabs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const completed = labs.filter((l) => l.progress.status === "completed").length;
  const inProgress = labs.filter((l) => l.progress.status === "in_progress").length;

  const filtered = labs.filter((lab) => {
    const matchSearch =
      !search ||
      lab.title.toLowerCase().includes(search.toLowerCase()) ||
      lab.category.toLowerCase().includes(search.toLowerCase()) ||
      lab.tags.some((t) => t.includes(search.toLowerCase())) ||
      (lab.cve?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchDiff = filterDiff === "All" || lab.difficulty === filterDiff;
    return matchSearch && matchDiff;
  });

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <div className="mb-8 grid-bg rounded-2xl border border-border p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-green/5 rounded-full blur-3xl -translate-y-16 translate-x-16" />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent-green text-sm font-mono mb-3">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            AGENTIC AI RED TEAM LAB
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Real-World AI Security Scenarios
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            Ten labs built from actual incidents: prompt injection attacks, supply chain compromises,
            agent hijacking, and jailbreaks. Each lab includes a simulated terminal, AI guide, and
            task checklist.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <Shield className="w-4 h-4 text-accent-green" />
              <span className="text-text-primary text-sm font-medium">{labs.length} Labs</span>
            </div>
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-text-green" />
              <span className="text-text-primary text-sm font-medium">{completed} Completed</span>
            </div>
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <Clock className="w-4 h-4 text-text-yellow" />
              <span className="text-text-primary text-sm font-medium">{inProgress} In Progress</span>
            </div>
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <Target className="w-4 h-4 text-accent-blue" />
              <span className="text-text-primary text-sm font-medium">
                {labs.reduce((a, l) => a + l.progress.completedTasks.length, 0)} Tasks Done
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search labs, CVEs, categories..."
            className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-text-primary placeholder-text-dim text-sm focus:border-accent-green/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-dim flex-shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDiff(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterDiff === d
                    ? "bg-accent-green text-bg-primary"
                    : "bg-bg-card border border-border text-text-secondary hover:border-accent-green/40"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Labs grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-xl p-5 animate-pulse h-52" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-dim">No labs match your search.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((lab) => (
            <LabCard key={lab.id} {...lab} />
          ))}
        </div>
      )}
    </div>
  );
}
