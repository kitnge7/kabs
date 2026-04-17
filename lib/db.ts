import { createClient, type Client } from "@libsql/client";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

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
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS lab_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'not_started',
      completed_tasks TEXT NOT NULL DEFAULT '[]',
      started_at INTEGER,
      completed_at INTEGER,
      UNIQUE(user_id, lab_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS replay_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      lab_id TEXT NOT NULL,
      surface TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'info',
      phase_id TEXT,
      artifact_id TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_progress_user ON lab_progress(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_chat_user_lab ON chat_history(user_id, lab_id)`,
    `CREATE INDEX IF NOT EXISTS idx_replay_user_lab ON replay_events(user_id, lab_id)`,
  ];
  for (const sql of stmts) {
    await db.execute(sql);
  }
  _ready = true;
}

// ── Users ──────────────────────────────────────────────────────────────────

export async function createUser(
  id: string,
  email: string,
  username: string,
  passwordHash: string
) {
  await ensureSchema();
  await getClient().execute({
    sql: "INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)",
    args: [id, email, username, passwordHash],
  });
}

export async function getUserByEmail(email: string): Promise<UserRow | undefined> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });
  return res.rows[0] as unknown as UserRow | undefined;
}

export async function getUserByUsername(username: string): Promise<UserRow | undefined> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: [username],
  });
  return res.rows[0] as unknown as UserRow | undefined;
}

export async function getUserById(id: string): Promise<Omit<UserRow, "password_hash"> | undefined> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT id, email, username, created_at FROM users WHERE id = ?",
    args: [id],
  });
  return res.rows[0] as unknown as Omit<UserRow, "password_hash"> | undefined;
}

// ── Lab Progress ───────────────────────────────────────────────────────────

export async function getLabProgress(userId: string, labId: string): Promise<LabProgressRow | undefined> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM lab_progress WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
  return res.rows[0] as unknown as LabProgressRow | undefined;
}

export async function getAllLabProgress(userId: string): Promise<LabProgressRow[]> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM lab_progress WHERE user_id = ?",
    args: [userId],
  });
  return res.rows as unknown as LabProgressRow[];
}

export async function upsertLabProgress(
  id: string,
  userId: string,
  labId: string,
  status: string,
  completedTasks: string[],
  startedAt?: number,
  completedAt?: number | null
) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO lab_progress (id, user_id, lab_id, status, completed_tasks, started_at, completed_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, lab_id) DO UPDATE SET
            status = excluded.status,
            completed_tasks = excluded.completed_tasks,
            started_at = COALESCE(lab_progress.started_at, excluded.started_at),
            completed_at = excluded.completed_at`,
    args: [
      id,
      userId,
      labId,
      status,
      JSON.stringify(completedTasks),
      startedAt ?? Math.floor(Date.now() / 1000),
      completedAt ?? null,
    ],
  });
}

export async function resetLabProgress(userId: string, labId: string) {
  await ensureSchema();
  await getClient().execute({
    sql: "DELETE FROM lab_progress WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
}

// ── Chat History ───────────────────────────────────────────────────────────

export async function getChatHistory(userId: string, labId: string): Promise<ChatRow[]> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM chat_history WHERE user_id = ? AND lab_id = ? ORDER BY created_at ASC",
    args: [userId, labId],
  });
  return res.rows as unknown as ChatRow[];
}

export async function addChatMessage(
  id: string,
  userId: string,
  labId: string,
  role: string,
  content: string
) {
  await ensureSchema();
  await getClient().execute({
    sql: "INSERT INTO chat_history (id, user_id, lab_id, role, content) VALUES (?, ?, ?, ?, ?)",
    args: [id, userId, labId, role, content],
  });
}

export async function clearChatHistory(userId: string, labId: string) {
  await ensureSchema();
  await getClient().execute({
    sql: "DELETE FROM chat_history WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
}

// ── Replay Events ──────────────────────────────────────────────────────────

export async function getReplayEvents(userId: string, labId: string): Promise<ReplayEventRow[]> {
  await ensureSchema();
  const res = await getClient().execute({
    sql: "SELECT * FROM replay_events WHERE user_id = ? AND lab_id = ? ORDER BY created_at ASC",
    args: [userId, labId],
  });
  return res.rows as unknown as ReplayEventRow[];
}

export async function addReplayEvent(
  id: string,
  userId: string,
  labId: string,
  surface: string,
  eventType: string,
  title: string,
  detail: string,
  severity: string,
  phaseId?: string,
  artifactId?: string
) {
  await ensureSchema();
  await getClient().execute({
    sql: `INSERT INTO replay_events
            (id, user_id, lab_id, surface, event_type, title, detail, severity, phase_id, artifact_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, userId, labId, surface, eventType, title, detail, severity, phaseId ?? null, artifactId ?? null, Date.now()],
  });
}

export async function clearReplayEvents(userId: string, labId: string) {
  await ensureSchema();
  await getClient().execute({
    sql: "DELETE FROM replay_events WHERE user_id = ? AND lab_id = ?",
    args: [userId, labId],
  });
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: number;
}

export interface LabProgressRow {
  id: string;
  user_id: string;
  lab_id: string;
  status: string;
  completed_tasks: string;
  started_at: number | null;
  completed_at: number | null;
}

export interface ChatRow {
  id: string;
  user_id: string;
  lab_id: string;
  role: string;
  content: string;
  created_at: number;
}

export interface ReplayEventRow {
  id: string;
  user_id: string;
  lab_id: string;
  surface: string;
  event_type: string;
  title: string;
  detail: string;
  severity: string;
  phase_id: string | null;
  artifact_id: string | null;
  created_at: number;
}
