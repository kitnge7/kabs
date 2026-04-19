import type { ToolDefinition, ToolCallRecord, V2LabTool, LabState } from "./types";

interface LLMProvider {
  name: string;
  url: string;
  apiKey: string;
  model: string;
  supportsTools: boolean;
}

const PROVIDERS: LLMProvider[] = [
  {
    name: "nvidia",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey: process.env.NVIDIA_API_KEY || "",
    model: "meta/llama-3.3-70b-instruct",
    supportsTools: true,
  },
  {
    name: "groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: process.env.GROQ_API_KEY || "",
    model: "llama-3.3-70b-versatile",
    supportsTools: true,
  },
];

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface AgentRunResult {
  finalText: string;
  toolCallRecords: ToolCallRecord[];
  updatedMessages: LLMMessage[];
}

async function callProvider(
  provider: LLMProvider,
  messages: LLMMessage[],
  tools: ToolDefinition[]
): Promise<{ content: string | null; toolCalls: OpenAIToolCall[]; finishReason: string }> {
  const body: Record<string, unknown> = {
    model: provider.model,
    messages,
    max_tokens: 2048,
    temperature: 0.3,
    stream: false,
  };

  if (tools.length > 0 && provider.supportsTools) {
    body.tools = tools.map((t) => ({ type: "function", function: t }));
    body.tool_choice = "auto";
  }

  const res = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${provider.name} ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{
      message: {
        content: string | null;
        tool_calls?: OpenAIToolCall[];
      };
      finish_reason: string;
    }>;
  };

  const choice = data.choices[0];
  return {
    content: choice.message.content,
    toolCalls: choice.message.tool_calls ?? [],
    finishReason: choice.finish_reason,
  };
}

async function llmCall(
  messages: LLMMessage[],
  tools: ToolDefinition[]
): Promise<{ content: string | null; toolCalls: OpenAIToolCall[]; finishReason: string }> {
  const errors: string[] = [];
  for (const provider of PROVIDERS) {
    if (!provider.apiKey) continue;
    try {
      return await callProvider(provider, messages, tools);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`All providers failed: ${errors.join(" | ")}`);
}

export async function runAgent(
  systemPrompt: string,
  conversationHistory: LLMMessage[],
  userMessage: string,
  labTools: V2LabTool[],
  state: LabState,
  onStateUpdate: (newState: LabState) => Promise<void>,
  onToolCall: (record: ToolCallRecord) => Promise<void>,
  maxTurns = 8
): Promise<AgentRunResult> {
  const toolDefs = labTools.map((t) => t.definition);
  const toolMap = new Map(labTools.map((t) => [t.definition.name, t]));

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const toolCallRecords: ToolCallRecord[] = [];
  let currentState = state;
  let turns = 0;

  while (turns < maxTurns) {
    turns++;
    const { content, toolCalls, finishReason } = await llmCall(messages, toolDefs);

    if (toolCalls.length === 0 || finishReason === "stop") {
      messages.push({ role: "assistant", content: content ?? "" });
      return {
        finalText: content ?? "",
        toolCallRecords,
        updatedMessages: messages.slice(conversationHistory.length + 1),
      };
    }

    // Append assistant message with tool_calls
    const assistantMsg: LLMMessage = {
      role: "assistant",
      content: content,
      tool_calls: toolCalls,
    };
    messages.push(assistantMsg);

    // Execute each tool call
    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      const tool = toolMap.get(toolName);

      let args: Record<string, unknown> = {};
      let result: unknown;

      try {
        args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }

      if (!tool) {
        result = { error: `Unknown tool: ${toolName}` };
      } else {
        try {
          const { result: toolResult, newState } = await tool.execute(args, currentState);
          result = toolResult;
          currentState = newState;
          await onStateUpdate(currentState);
        } catch (err) {
          result = { error: err instanceof Error ? err.message : "Tool execution failed" };
        }
      }

      const record: ToolCallRecord = {
        id: tc.id,
        toolName,
        input: args,
        output: result,
        calledAt: Date.now(),
      };
      toolCallRecords.push(record);
      await onToolCall(record);

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name: toolName,
        content: JSON.stringify(result),
      });
    }
  }

  // Max turns reached — get a final response without tools
  const { content: finalContent } = await llmCall(
    [...messages, { role: "user", content: "Please summarize what you've done." }],
    []
  );
  messages.push({ role: "assistant", content: finalContent ?? "" });

  return {
    finalText: finalContent ?? "",
    toolCallRecords,
    updatedMessages: messages.slice(conversationHistory.length + 1),
  };
}

export function messagesToHistory(rows: Array<{
  role: string;
  content: string | null;
  tool_calls_json: string | null;
  tool_call_id: string | null;
  tool_name: string | null;
}>): LLMMessage[] {
  return rows.map((r) => {
    const msg: LLMMessage = {
      role: r.role as LLMMessage["role"],
      content: r.content,
    };
    if (r.tool_calls_json) {
      msg.tool_calls = JSON.parse(r.tool_calls_json) as LLMMessage["tool_calls"];
    }
    if (r.tool_call_id) {
      msg.tool_call_id = r.tool_call_id;
    }
    if (r.tool_name) {
      msg.name = r.tool_name;
    }
    return msg;
  });
}
