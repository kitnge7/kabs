import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromCookies } from "@/lib/auth";
import { getLabProgress, upsertLabProgress } from "@/lib/db";
import { getLabById } from "@/lib/labs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const lab = getLabById(params.labId);
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

  // Scoped to authenticated user — no IDOR possible
  const prog = getLabProgress(session.sub, params.labId);

  return NextResponse.json(
    prog
      ? {
          status: prog.status,
          completedTasks: JSON.parse(prog.completed_tasks) as string[],
          startedAt: prog.started_at,
          completedAt: prog.completed_at,
        }
      : { status: "not_started", completedTasks: [] }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const lab = getLabById(params.labId);
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

  const body = await req.json();
  const { taskId, action } = body as { taskId?: string; action?: "complete" | "uncomplete" | "start" };

  const existing = getLabProgress(session.sub, params.labId);
  const completedTasks: string[] = existing
    ? (JSON.parse(existing.completed_tasks) as string[])
    : [];

  let newStatus = existing?.status ?? "not_started";
  const now = Math.floor(Date.now() / 1000);

  if (action === "start" && newStatus === "not_started") {
    newStatus = "in_progress";
  }

  if (taskId && action === "complete") {
    if (!completedTasks.includes(taskId)) completedTasks.push(taskId);
    if (newStatus === "not_started") newStatus = "in_progress";
  }

  if (taskId && action === "uncomplete") {
    const idx = completedTasks.indexOf(taskId);
    if (idx !== -1) completedTasks.splice(idx, 1);
  }

  // Auto-complete the lab when all tasks are done
  const allDone = lab.tasks.every((t) => completedTasks.includes(t.id));
  if (allDone) newStatus = "completed";
  else if (completedTasks.length > 0) newStatus = "in_progress";

  const completedAt = newStatus === "completed" ? now : null;

  upsertLabProgress(
    existing?.id ?? uuidv4(),
    session.sub,
    params.labId,
    newStatus,
    completedTasks,
    existing?.started_at ?? now,
    completedAt ?? undefined
  );

  return NextResponse.json({
    status: newStatus,
    completedTasks,
    startedAt: existing?.started_at ?? now,
    completedAt,
  });
}
