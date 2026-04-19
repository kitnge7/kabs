import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { V2_LABS } from "@/lib/v2/labs/index";
import { getAllV2Progress } from "@/lib/v2/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const progressRows = await getAllV2Progress(session.sub);
  const progressMap = new Map(progressRows.map((r) => [r.lab_id, r]));

  const labs = V2_LABS.map((lab) => {
    const prog = progressMap.get(lab.id);
    return {
      id: lab.id,
      title: lab.title,
      subtitle: lab.subtitle,
      difficulty: lab.difficulty,
      category: lab.category,
      exploitClass: lab.exploitClass,
      tags: lab.tags,
      incidentDate: lab.incidentDate,
      description: lab.description,
      toolCount: lab.tools.length,
      progress: {
        solved: prog ? prog.solved === 1 : false,
        solvedAt: prog?.solved_at ?? null,
      },
    };
  });

  return NextResponse.json(labs);
}
