import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getLabById } from "@/lib/labs";
import { getReplayEventsForClient } from "@/lib/labs/replay";

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

  return NextResponse.json(await getReplayEventsForClient(session.sub, params.labId));
}
