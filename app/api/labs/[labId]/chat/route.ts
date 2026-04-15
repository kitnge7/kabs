import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromCookies } from "@/lib/auth";
import { getChatHistory, addChatMessage, clearChatHistory } from "@/lib/db";
import { getLabById } from "@/lib/labs";
import { chat, buildMessages } from "@/lib/llm";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const lab = getLabById(params.labId);
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

  const history = getChatHistory(session.sub, params.labId);

  return NextResponse.json(
    history.map((m) => ({ role: m.role, content: m.content, id: m.id }))
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
  const { message } = body as { message?: string };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const trimmed = message.trim().slice(0, 4000);

  const history = getChatHistory(session.sub, params.labId);
  const recentHistory = history.slice(-20);
  const messages = buildMessages(lab.systemPrompt, recentHistory, trimmed);

  const rawReply = await chat(messages, 0.7);

  // Detect win condition for exploit-mode labs
  let exploitSucceeded = false;
  let winMessage: string | undefined;
  let winTaskId: string | undefined;
  let displayReply = rawReply;

  if (lab.exploitMode) {
    const { winToken } = lab.exploitMode;
    if (rawReply.includes(winToken)) {
      exploitSucceeded = true;
      winMessage = lab.exploitMode.winMessage;
      winTaskId = lab.exploitMode.winTaskId;
      // Strip the win token (and anything after it) from the displayed reply
      displayReply = rawReply.split(winToken)[0].trimEnd();
    }
  }

  addChatMessage(uuidv4(), session.sub, params.labId, "user", trimmed);
  addChatMessage(uuidv4(), session.sub, params.labId, "assistant", displayReply);

  return NextResponse.json({
    reply: displayReply,
    exploitSucceeded,
    ...(exploitSucceeded && { winMessage, winTaskId }),
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const lab = getLabById(params.labId);
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

  clearChatHistory(session.sub, params.labId);
  return NextResponse.json({ ok: true });
}
