"use client";

import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Filter,
  FlaskConical,
  Search,
  Shield,
} from "lucide-react";
import LabCard from "@/components/LabCard";

interface LabSummary {
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

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard", "Very Hard"] as const;

export default function DashboardPage() {
  const [labs, setLabs] = useState<LabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDiff, setFilterDiff] =
    useState<(typeof DIFFICULTIES)[number]>("All");

  useEffect(() => {
    fetch("/api/labs")
      .then((r) => r.json())
      .then((data) => {
        setLabs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = labs.filter((lab) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch =
      !needle ||
      lab.title.toLowerCase().includes(needle) ||
      lab.category.toLowerCase().includes(needle) ||
      lab.exploitClass.toLowerCase().includes(needle) ||
      lab.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
      (lab.cve?.toLowerCase().includes(needle) ?? false);

    const matchesDifficulty =
      filterDiff === "All" || lab.difficulty === filterDiff;

    return matchesSearch && matchesDifficulty;
  });

  const completed = labs.filter((lab) => lab.progress.status === "completed").length;
  const primary = labs.filter((lab) => lab.confidence === "primary").length;
  const exact = labs.filter((lab) => lab.fidelity === "exact-replay").length;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 grid-bg rounded-2xl border border-border p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-green/5 rounded-full blur-3xl -translate-y-16 translate-x-16" />
        <div className="relative">
          <div className="flex items-center gap-2 text-accent-green text-sm font-mono mb-3">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            HISTORICAL INCIDENT REPLAY BENCH
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Agentic AI Red Team Incident Replays
          </h1>
          <p className="text-text-secondary max-w-3xl leading-relaxed">
            Ten real AI security incidents rebuilt as evidence-backed replays.
            Each scenario lets you exploit a live LLM or step through a
            deterministic terminal walkthrough — then see exactly why it worked.
          </p>

          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <Shield className="w-4 h-4 text-accent-green" />
              <span className="text-text-primary text-sm font-medium">
                {labs.length} Gold Labs
              </span>
            </div>
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <BookOpenCheck className="w-4 h-4 text-accent-blue" />
              <span className="text-text-primary text-sm font-medium">
                {primary} Primary-Source Labs
              </span>
            </div>
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <FlaskConical className="w-4 h-4 text-text-yellow" />
              <span className="text-text-primary text-sm font-medium">
                {exact} Exact Replays
              </span>
            </div>
            <div className="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-4 py-2.5">
              <CheckCircle2 className="w-4 h-4 text-text-green" />
              <span className="text-text-primary text-sm font-medium">
                {completed} Completed
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, exploit classes, tags, CVEs..."
            className="w-full bg-bg-card border border-border rounded-lg pl-9 pr-4 py-2.5 text-text-primary placeholder-text-dim text-sm focus:border-accent-green/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-dim flex-shrink-0" />
          <div className="flex gap-1 flex-wrap">
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                onClick={() => setFilterDiff(difficulty)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterDiff === difficulty
                    ? "bg-accent-green text-bg-primary"
                    : "bg-bg-card border border-border text-text-secondary hover:border-accent-green/40"
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-bg-card border border-border rounded-xl p-5 animate-pulse h-72"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-text-dim">
          No labs match your current filters.
        </div>
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
