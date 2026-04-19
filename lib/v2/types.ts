export type V2Difficulty = "Medium" | "Hard" | "Very Hard";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}

export interface ToolCallRecord {
  id: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  calledAt: number;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string | null;
  toolCallsJson?: string | null;
  toolCallId?: string | null;
  toolName?: string | null;
  createdAt: number;
}

export type LabState = Record<string, unknown>;

export interface WinResult {
  solved: boolean;
  message: string;
}

export interface V2LabTool {
  definition: ToolDefinition;
  execute: (
    args: Record<string, unknown>,
    state: LabState
  ) => Promise<{ result: unknown; newState: LabState }>;
}

export interface StateFieldConfig {
  label: string;
  path: string;
  render: "balance" | "table" | "list" | "badge";
}

export interface V2Lab {
  id: string;
  title: string;
  subtitle: string;
  difficulty: V2Difficulty;
  category: string;
  exploitClass: string;
  tags: string[];
  incidentDate: string;
  description: string;
  caseStudy: {
    summary: string;
    background: string;
    technicalAnalysis: string;
    knownFacts: string[];
    attackGoal: string;
  };
  agentName: string;
  agentSystemPrompt: string;
  agentIntro: string;
  initialState: () => LabState;
  tools: V2LabTool[];
  winCondition: (state: LabState) => WinResult;
  stateDisplayLabel: string;
}
