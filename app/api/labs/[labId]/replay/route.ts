import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getLabById } from "@/lib/labs";
import { resetReplayState, runReplayAction } from "@/lib/labs/replay";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
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

  const body = await req.json();
  const { surface, input, action } = body as {
    surface?: "terminal" | "attack";
    input?: string;
    action?: "reset";
  };

  if (action === "reset") {
    resetReplayState(session.sub, params.labId);
    return NextResponse.json({
      progress: { status: "not_started", completedPhaseIds: [] },
      events: [],
      reset: true,
    });
  }

  if (!surface || (surface !== "terminal" && surface !== "attack")) {
    return NextResponse.json({ error: "Valid surface is required" }, { status: 400 });
  }

  if (!input || typeof input !== "string" || input.trim().length === 0) {
    return NextResponse.json({ error: "Input is required" }, { status: 400 });
  }

  const result = runReplayAction({
    userId: session.sub,
    labId: params.labId,
    surface,
    input: input.trim().slice(0, 8000),
  });

  return NextResponse.json(result);
}
