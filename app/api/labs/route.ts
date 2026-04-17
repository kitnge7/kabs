import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getAllLabProgress } from "@/lib/db";
import { filterCompletedPhaseIds, getAllLabs, getReplayStatus } from "@/lib/labs";

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
    const completedPhaseIds = prog
      ? filterCompletedPhaseIds(
          lab,
          JSON.parse(prog.completed_tasks) as string[]
        )
      : [];

    return {
      id: lab.id,
      title: lab.title,
      subtitle: lab.subtitle,
      difficulty: lab.difficulty,
      category: lab.category,
      exploitClass: lab.exploitClass,
      tags: lab.tags,
      cve: lab.cve,
      incidentDate: lab.incidentDate,
      description: lab.description,
      confidence: lab.confidence,
      fidelity: lab.fidelity,
      sourceCount: lab.sources.length,
      phaseCount: lab.replay.phases.length,
      progress: {
        status: getReplayStatus(lab, completedPhaseIds),
        completedPhaseIds,
        startedAt: prog?.started_at ?? undefined,
        completedAt:
          getReplayStatus(lab, completedPhaseIds) === "completed"
            ? prog?.completed_at ?? undefined
            : undefined,
      },
    };
  });

  return NextResponse.json(labsWithProgress);
}
