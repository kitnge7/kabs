import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { getChatHistory } from "@/lib/db";
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

  const history = await getChatHistory(session.sub, params.labId);

  return NextResponse.json(
    history.map((m) => ({ role: m.role, content: m.content, id: m.id }))
  );
}
