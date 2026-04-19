import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getV2LabById } from "@/lib/v2/labs/index";
import { deleteLabState, deleteMessages, deleteToolCalls } from "@/lib/v2/db";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const lab = getV2LabById(params.labId);
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

  await Promise.all([
    deleteLabState(session.sub, params.labId),
    deleteMessages(session.sub, params.labId),
    deleteToolCalls(session.sub, params.labId),
  ]);

  return NextResponse.json({ ok: true, freshState: lab.initialState() });
}
