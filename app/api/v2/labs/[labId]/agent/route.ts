import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSessionFromCookies } from "@/lib/auth";
import { getV2LabById } from "@/lib/v2/labs/index";
import {
  getLabState,
  upsertLabState,
  getMessages,
  insertMessage,
  insertToolCall,
} from "@/lib/v2/db";
import { runAgent, messagesToHistory } from "@/lib/v2/agent";
import type { LabState, ToolCallRecord } from "@/lib/v2/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: NextRequest,
  { params }: { params: { labId: string } }
) {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const lab = getV2LabById(params.labId);
  if (!lab) return NextResponse.json({ error: "Lab not found" }, { status: 404 });

  const body = await req.json() as { message?: string };
  const userMessage = body.message?.trim().slice(0, 8000) ?? "";
  if (!userMessage) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  // Load or initialize state
  const stateRow = await getLabState(session.sub, params.labId);
  let currentState: LabState = stateRow ? JSON.parse(stateRow.state_json) : lab.initialState();

  // Don't allow messages if already solved
  if (stateRow?.solved === 1) {
    return NextResponse.json({
      reply: "This lab is already solved. Reset to try again.",
      toolCalls: [],
      state: currentState,
      solved: true,
      solvedMessage: "",
    });
  }

  // Load conversation history
  const messageRows = await getMessages(session.sub, params.labId);
  const history = messagesToHistory(messageRows);

  // Save user message
  const userMsgId = uuidv4();
  await insertMessage(userMsgId, session.sub, params.labId, "user", userMessage);

  const turnId = uuidv4();
  const toolCallRecordsThisTurn: ToolCallRecord[] = [];

  // Run agent with tool-use loop
  let finalText = "";
  let agentError: string | null = null;

  try {
    const result = await runAgent(
      lab.agentSystemPrompt,
      history,
      userMessage,
      lab.tools,
      currentState,
      async (newState: LabState) => {
        currentState = newState;
        await upsertLabState(uuidv4(), session.sub, params.labId, newState, false);
      },
      async (record: ToolCallRecord) => {
        toolCallRecordsThisTurn.push(record);
        await insertToolCall(
          uuidv4(),
          session.sub,
          params.labId,
          turnId,
          record.toolName,
          record.input,
          record.output
        );
      }
    );

    finalText = result.finalText;

    // Persist all new messages from the agent turn
    for (const msg of result.updatedMessages) {
      if (msg.role === "user") continue; // already saved above
      await insertMessage(
        uuidv4(),
        session.sub,
        params.labId,
        msg.role,
        msg.content,
        msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
        msg.tool_call_id ?? null,
        msg.name ?? null
      );
    }
  } catch (err) {
    agentError = err instanceof Error ? err.message : "Agent failed";
    finalText = `I encountered an error processing your request. Please try again.`;
  }

  // Check win condition against actual state
  const winResult = lab.winCondition(currentState);

  if (winResult.solved && stateRow?.solved !== 1) {
    await upsertLabState(
      uuidv4(),
      session.sub,
      params.labId,
      currentState,
      true,
      Math.floor(Date.now() / 1000)
    );
  }

  return NextResponse.json({
    reply: finalText,
    toolCalls: toolCallRecordsThisTurn,
    state: currentState,
    solved: winResult.solved,
    solvedMessage: winResult.message,
    error: agentError,
  });
}
