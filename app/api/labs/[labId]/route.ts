import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getLabProgress } from "@/lib/db";
import { filterCompletedPhaseIds, getLabById, getReplayStatus } from "@/lib/labs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const lab = getLabById(params.labId);
  if (!lab) {
    return NextResponse.json({ error: "Lab not found" }, { status: 404 });
  }

  const prog = getLabProgress(session.sub, params.labId);
  const completedPhaseIds = prog
    ? filterCompletedPhaseIds(lab, JSON.parse(prog.completed_tasks) as string[])
    : [];
  const status = getReplayStatus(lab, completedPhaseIds);

  const attackConfig = lab.replay.attack
    ? {
        targetName: lab.replay.attack.targetName,
        targetDescription: lab.replay.attack.targetDescription,
        briefing: lab.replay.attack.briefing,
        intro: lab.replay.attack.intro,
        placeholder: lab.replay.attack.placeholder,
      }
    : null;

  const terminalCommands = Object.fromEntries(
    Object.entries(lab.replay.terminalActions).map(([command, config]) => [
      command,
      { summary: config.summary },
    ])
  );

  return NextResponse.json({
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
    caseStudy: lab.caseStudy,
    sources: lab.sources,
    replayMeta: {
      summary: lab.replay.summary,
      objectivePhaseId: lab.replay.objectivePhaseId,
      phases: lab.replay.phases,
      surfaces: lab.replay.surfaces,
      terminalCommands,
      attackConfig,
      hasExploitMode: Boolean(lab.exploitMode),
    },
    liveTarget: lab.liveTarget ?? null,
    progress: {
      status,
      completedPhaseIds,
      startedAt: prog?.started_at ?? undefined,
      completedAt: status === "completed" ? prog?.completed_at ?? undefined : undefined,
    },
  });
}
