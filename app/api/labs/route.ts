import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAllLabProgress } from "@/lib/db";
import { getAllLabs } from "@/lib/labs";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const labs = getAllLabs();
  const progressRows = getAllLabProgress(session.sub);
  const progressMap = Object.fromEntries(
    progressRows.map((p) => [p.lab_id, p])
  );

  const labsWithProgress = labs.map((lab) => {
    const prog = progressMap[lab.id];
    return {
      id: lab.id,
      title: lab.title,
      subtitle: lab.subtitle,
      difficulty: lab.difficulty,
      category: lab.category,
      tags: lab.tags,
      cve: lab.cve,
      incident: lab.incident,
      description: lab.description,
      objectives: lab.objectives,
      taskCount: lab.tasks.length,
      progress: prog
        ? {
            status: prog.status,
            completedTasks: JSON.parse(prog.completed_tasks) as string[],
            startedAt: prog.started_at,
            completedAt: prog.completed_at,
          }
        : { status: "not_started", completedTasks: [] },
    };
  });

  return NextResponse.json(labsWithProgress);
}
