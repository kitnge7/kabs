import { createClient, type Client } from "@libsql/client";
import type { AgentMessage, LabState, ToolCallRecord } from "./types";

const TURSO_URL = process.env.TURSO_DATABASE_URL?.trim();
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN?.trim();

if (!TURSO_URL) throw new Error("TURSO_DATABASE_URL environment variable is required");
if (!TURSO_TOKEN) throw new Error("TURSO_AUTH_TOKEN environment variable is required");

let _client: Client | null = null;
let _ready = false;

function getClient(): Client {
  if (!_client) {
    _client = createClient({ url: TURSO_URL!, authToken: TURSO_TOKEN! });
  }
  return _client;
}

async function ensureSchema() {
  if (_ready) return;
  const db = getClient();
  const stmts = [
    `CREATE TABLE IF NOT EXISTS v2_lab_state (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      state_json TEXT NOT NULL DEFAULT '{}',
      solved INTEGER NOT NULL DEFAULT 0,
      solved_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(user_id, lab_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS v2_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      tool_calls_json TEXT,
      tool_call_id TEXT,
      tool_name TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS v2_tool_calls (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      turn_id TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      called_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_v2_state_user_lab ON v2_lab_state(user_id, lab_id)`,
    `CREATE INDEX IF NOT EXISTS idx_v2_msgs_user_lab ON v2_messages(user_id, lab_id)`,
    `CREATE INDEX IF NOT EXISTS idx_v2_tools_user_lab ON v2_tool_calls(user_id, lab_id)`,
  ];
  for (const sql of stmts) {
    await db.execute(sql);
  }
  _ready = true;
}

// ── State ──────────────────────────────────────────────────────────────────

export interface V2StateRow {
  id: string;
  user_id: string;
  lab_id: string;
  state_json: string;
  solved: number;
  solved_at: number | null;
  created_at: number;
  updated_at: number;
}

export async function getLabState(userId: string, labId: string): Promise<V2StateRow | null> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM v2_lab_state WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
  return (res.rows[0] as unknown as V2StateRow) ?? null;
}

export async function upsertLabState(
  id: string,
  userId: string,
  labId: string,
  state: LabState,
  solved: boolean,
  solvedAt?: number | null
) {
  await ensureSchema();
  const now = Math.floor(Date.now() / 1000);
  await getClient().execute({
    sql: `INSERT INTO v2_lab_state (id, user_id, lab_id, state_json, solved, solved_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, lab_id) DO UPDATE SET
            state_json = excluded.state_json,
            solved = excluded.solved,
            solved_at = CASE WHEN v2_lab_state.solved = 1 THEN v2_lab_state.solved_at ELSE excluded.solved_at END,
            updated_at = excluded.updated_at`,
    args: [id, userId, labId, JSON.stringify(state), solved ? 1 : 0, solvedAt ?? null, now, now],
  });
}

export async function deleteLabState(userId: string, labId: string) {
  await ensureSchema();
  await getClient().execute({
    sql: "DELETE FROM v2_lab_state WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
}

// ── Messages ───────────────────────────────────────────────────────────────

export interface V2MessageRow {
  id: string;
  user_id: string;
  lab_id: string;
  role: string;
  content: string | null;
  tool_calls_json: string | null;
  tool_call_id: string | null;
  tool_name: string | null;
  created_at: number;
}

export async function getMessages(userId: string, labId: string): Promise<V2MessageRow[]> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM v2_messages WHERE user_id = ? AND lab_id = ? ORDER BY created_at ASC, id ASC",
    args: [userId, labId],
  });
  return res.rows as unknown as V2MessageRow[];
}

export async function insertMessage(
  id: string,
  userId: string,
  labId: string,
  role: string,
  content: string | null,
  toolCallsJson?: string | null,
  toolCallId?: string | null,
  toolName?: string | null
) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO v2_messages (id, user_id, lab_id, role, content, tool_calls_json, tool_call_id, tool_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, labId, role, content ?? null, toolCallsJson ?? null, toolCallId ?? null, toolName ?? null],
  });
}

export async function deleteMessages(userId: string, labId: string) {
  await ensureSchema();
  await getClient().execute({
    sql: "DELETE FROM v2_messages WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
}

// ── Tool Calls ─────────────────────────────────────────────────────────────

export interface V2ToolCallRow {
  id: string;
  user_id: string;
  lab_id: string;
  turn_id: string;
  tool_name: string;
  input_json: string;
  output_json: string;
  called_at: number;
}

export async function insertToolCall(
  id: string,
  userId: string,
  labId: string,
  turnId: string,
  toolName: string,
  input: unknown,
  output: unknown
) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO v2_tool_calls (id, user_id, lab_id, turn_id, tool_name, input_json, output_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, labId, turnId, toolName, JSON.stringify(input), JSON.stringify(output)],
  });
}

export async function getToolCalls(userId: string, labId: string): Promise<ToolCallRecord[]> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM v2_tool_calls WHERE user_id = ? AND lab_id = ? ORDER BY called_at ASC",
    args: [userId, labId],
  });
  return (res.rows as unknown as V2ToolCallRow[]).map((r) => ({
    id: r.id,
    toolName: r.tool_name,
    input: JSON.parse(r.input_json) as Record<string, unknown>,
    output: JSON.parse(r.output_json),
    calledAt: r.called_at,
  }));
}

export async function deleteToolCalls(userId: string, labId: string) {
  await ensureSchema();
  await getClient().execute({
    sql: "DELETE FROM v2_tool_calls WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
}

// ── All-progress list for dashboard ───────────────────────────────────────

export async function getAllV2Progress(userId: string): Promise<V2StateRow[]> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM v2_lab_state WHERE user_id = ?",
    args: [userId],
  });
  return res.rows as unknown as V2StateRow[];
}

export type { AgentMessage };
