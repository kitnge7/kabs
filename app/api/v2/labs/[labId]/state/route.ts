import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getV2LabById } from "@/lib/v2/labs/index";
import { getLabState, getToolCalls } from "@/lib/v2/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const lab = getV2LabById(params.labId);
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

  const stateRow = await getLabState(session.sub, params.labId);
  const currentState = stateRow ? JSON.parse(stateRow.state_json) : lab.initialState();
  const toolCalls = stateRow ? await getToolCalls(session.sub, params.labId) : [];

  return NextResponse.json({
    state: currentState,
    toolCalls,
    solved: stateRow ? stateRow.solved === 1 : false,
    solvedAt: stateRow?.solved_at ?? null,
  });
}
