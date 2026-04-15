"use client";

import { useState } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string;
  hint?: string;
}

interface TaskChecklistProps {
  tasks: Task[];
  labId: string;
  completedTasks: string[];
  onTaskToggle: (taskId: string, complete: boolean) => void;
}

export default function TaskChecklist({ tasks, labId, completedTasks, onTaskToggle }: TaskChecklistProps) {
  const [expandedHints, setExpandedHints] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  function toggleHint(taskId: string) {
    setExpandedHints((prev) => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  }

  async function toggle(task: Task) {
    const isComplete = completedTasks.includes(task.id);
    setLoading(task.id);
    try {
      await onTaskToggle(task.id, !isComplete);
    } finally {
      setLoading(null);
    }
  }

  const doneCount = completedTasks.length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-text-primary">Lab Progress</span>
          <span className="text-sm font-mono text-accent-green">{doneCount}/{total}</span>
        </div>
        <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className="progress-bar h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <div className="mt-3 text-center text-text-green text-sm font-medium animate-fade-in">
            🎯 Lab completed!
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, idx) => {
          const done = completedTasks.includes(task.id);
          const isLoading = loading === task.id;
          const hintOpen = expandedHints.has(task.id);

          return (
            <div
              key={task.id}
              className={`bg-bg-card border rounded-xl transition-colors ${
                done ? "border-text-green/30" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Step number */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                  done ? "bg-text-green/20 text-text-green" : "bg-bg-secondary text-text-dim border border-border"
                }`}>
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className={`text-sm font-medium ${done ? "text-text-green line-through opacity-70" : "text-text-primary"}`}>
                        {task.title}
                      </h4>
                      <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">{task.description}</p>
                    </div>
                    {/* Checkbox */}
                    <button
                      onClick={() => toggle(task)}
                      disabled={isLoading}
                      className="flex-shrink-0 transition-colors disabled:opacity-50"
                    >
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-text-green" />
                      ) : (
                        <Circle className="w-5 h-5 text-text-dim hover:text-text-secondary" />
                      )}
                    </button>
                  </div>

                  {/* Hint toggle */}
                  {task.hint && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleHint(task.id)}
                        className="flex items-center gap-1.5 text-xs text-text-dim hover:text-text-yellow transition-colors"
                      >
                        <Lightbulb className="w-3.5 h-3.5" />
                        <span>{hintOpen ? "Hide hint" : "Show hint"}</span>
                        {hintOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {hintOpen && (
                        <div className="mt-2 text-xs text-text-yellow bg-text-yellow/5 border border-text-yellow/20 rounded-lg px-3 py-2 leading-relaxed animate-fade-in">
                          💡 {task.hint}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
