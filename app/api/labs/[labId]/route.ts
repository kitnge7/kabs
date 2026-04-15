import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getLabProgress } from "@/lib/db";
import { getLabById } from "@/lib/labs";

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

  // Build client-safe exploit config — winToken stays server-side
  const exploitConfig = lab.exploitMode
    ? {
        targetName: lab.exploitMode.targetName,
        targetDescription: lab.exploitMode.targetDescription,
        attackContext: lab.exploitMode.attackContext,
        winMessage: lab.exploitMode.winMessage,
        winTaskId: lab.exploitMode.winTaskId,
      }
    : null;

  // Omit systemPrompt and exploitMode (contains winToken) from client response
  const { systemPrompt: _sp, exploitMode: _em, ...labPublic } = lab;

  return NextResponse.json({
    ...labPublic,
    exploitConfig,
    progress: prog
      ? {
          status: prog.status,
          completedTasks: JSON.parse(prog.completed_tasks) as string[],
          startedAt: prog.started_at,
          completedAt: prog.completed_at,
        }
      : { status: "not_started", completedTasks: [] },
  });
}
